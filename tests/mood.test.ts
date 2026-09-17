/**
 * The caregiver's own "how did that feel?" read, and how it's compared with what's
 * measured. Never asked twice for the same session, and never corrected toward the
 * measured data when the two disagree.
 */
import { describe, expect, it } from "vitest";
import { sessionToAskAbout, moodValue, moodVsMeasured, EMPTY_MOOD, type MoodState } from "../src/game/mood/mood";
import { computeTrajectory } from "../src/game/trajectory/trajectory";
import type { SessionRecord } from "../src/game/session/history";
import type { HealthWorkerEvent } from "../src/health-worker/boundary";

const DAY = 86_400_000;
const NOW = new Date(2026, 8, 17, 15, 0).getTime();

function record(sessionId: string, daysAgo: number, completed = true): SessionRecord {
  const at = NOW - daysAgo * DAY;
  return { sessionId, activityId: "hearth-sequence", startedAt: at, endedAt: at + 60_000, completed, parts: 3, partsWithoutHelp: 3 };
}

describe("sessionToAskAbout", () => {
  it("is null when nothing has been completed yet", () => {
    expect(sessionToAskAbout([], EMPTY_MOOD, NOW)).toBeNull();
    expect(sessionToAskAbout([record("s1", 1, false)], EMPTY_MOOD, NOW)).toBeNull();
  });

  it("offers the most recent completed session", () => {
    const records = [record("s1", 3), record("s2", 2), record("s3", 1)];
    expect(sessionToAskAbout(records, EMPTY_MOOD, NOW)?.sessionId).toBe("s3");
  });

  it("never offers a session already answered", () => {
    const records = [record("s1", 3), record("s2", 2)];
    const state: MoodState = { entries: [{ sessionId: "s2", at: NOW, read: "same" }], skippedSessionIds: [] };
    expect(sessionToAskAbout(records, state, NOW)?.sessionId).toBe("s1");
  });

  it("never offers a session already skipped, and skipping doesn't ask again", () => {
    const records = [record("s1", 1)];
    const state: MoodState = { entries: [], skippedSessionIds: ["s1"] };
    expect(sessionToAskAbout(records, state, NOW)).toBeNull();
  });
});

describe("moodValue", () => {
  it("maps each read to a fixed point on the 0-1 scale, easier reading higher", () => {
    expect(moodValue("easier")).toBeGreaterThan(moodValue("same"));
    expect(moodValue("same")).toBeGreaterThan(moodValue("harder"));
  });
});

function steadyTrajectory() {
  const events: HealthWorkerEvent[] = [];
  for (let d = 19; d >= 0; d--) events.push({ kind: "activity", t: NOW - d * DAY, domain: "attention", cue: 1, elapsedMs: 20_000 });
  return computeTrajectory(events, NOW);
}

function decliningTrajectory() {
  const events: HealthWorkerEvent[] = [];
  for (let d = 34; d >= 21; d--) events.push({ kind: "activity", t: NOW - d * DAY, domain: "attention", cue: 0, elapsedMs: 20_000 });
  for (let d = 20; d >= 0; d--) events.push({ kind: "activity", t: NOW - d * DAY, domain: "attention", cue: 4, elapsedMs: 20_000 });
  return computeTrajectory(events, NOW);
}

function entries(reads: ("easier" | "same" | "harder")[]): MoodState {
  return { entries: reads.map((read, i) => ({ sessionId: `s${i}`, at: NOW - i * DAY, read })), skippedSessionIds: [] };
}

describe("moodVsMeasured", () => {
  it("says nothing before the trajectory has its own baseline", () => {
    const notReady = computeTrajectory([], NOW);
    expect(moodVsMeasured(entries(["harder", "harder", "harder"]), notReady, NOW)).toBeNull();
  });

  it("says nothing with fewer than three recent reads", () => {
    expect(moodVsMeasured(entries(["harder", "harder"]), steadyTrajectory(), NOW)).toBeNull();
  });

  it("ignores reads from outside the recent window", () => {
    const stale: MoodState = {
      entries: [
        { sessionId: "a", at: NOW - 30 * DAY, read: "harder" },
        { sessionId: "b", at: NOW - 31 * DAY, read: "harder" },
        { sessionId: "c", at: NOW - 32 * DAY, read: "harder" },
      ],
      skippedSessionIds: [],
    };
    expect(moodVsMeasured(stale, steadyTrajectory(), NOW)).toBeNull();
  });

  it("agreeing-steady: caregiver reads it as fine, nothing measured has moved", () => {
    const r = moodVsMeasured(entries(["easier", "same", "same"]), steadyTrajectory(), NOW);
    expect(r?.case).toBe("agreeing-steady");
    expect(r?.sentence).toBe("What you're seeing matches what we're measuring.");
  });

  it("agreeing-declining: caregiver reads it as harder, and the measured trend has moved too", () => {
    const r = moodVsMeasured(entries(["harder", "harder", "same"]), decliningTrajectory(), NOW);
    expect(r?.case).toBe("agreeing-declining");
    expect(r?.sentence).toMatch(/adds real weight/);
  });

  it("diverging: caregiver reads it as harder, but nothing is measured as declining", () => {
    const r = moodVsMeasured(entries(["harder", "harder", "same"]), steadyTrajectory(), NOW);
    expect(r?.case).toBe("diverging");
    expect(r?.sentence).toMatch(/worth mentioning to a doctor/);
    expect(r?.sentence).not.toMatch(/sundown|dementia|diagnos/i);
  });

  it("diverging the other way: the measured trend has moved, but it hasn't felt that way to the caregiver", () => {
    const r = moodVsMeasured(entries(["same", "easier", "same"]), decliningTrajectory(), NOW);
    expect(r?.case).toBe("diverging");
    expect(r?.sentence).toMatch(/worth mentioning to a doctor/);
  });
});
