/**
 * Time-of-day performance map: gated honestly, relative to her own average only, and never
 * naming a clinical pattern.
 */
import { describe, expect, it } from "vitest";
import { computeRhythm } from "../src/game/rhythm/rhythm";
import { DOMAINS } from "../src/data/domains";
import type { HealthWorkerEvent } from "../src/health-worker/boundary";

const DAY = 86_400_000;
const NOW = new Date(2026, 8, 17, 12, 0).getTime();

function sessionStarts(n: number): HealthWorkerEvent[] {
  return Array.from({ length: n }, (_, i) => ({ kind: "session_start" as const, t: NOW - i * DAY, sessionId: `s${i}` }));
}

function activityAt(daysAgo: number, hour: number, domain: (typeof DOMAINS)[number], cue: number): HealthWorkerEvent {
  const base = new Date(NOW);
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - daysAgo, hour, 0);
  return { kind: "activity", t: d.getTime(), domain, cue, elapsedMs: 20_000 };
}

describe("computeRhythm — gating", () => {
  it("is 'getting-to-know' below 10 sessions, even with plenty of windows", () => {
    const events = [...sessionStarts(4), ...DOMAINS.flatMap((d) => [activityAt(1, 9, d, 0), activityAt(1, 12, d, 0), activityAt(1, 20, d, 0)])];
    const r = computeRhythm(events, NOW);
    expect(r.state).toBe("getting-to-know");
    if (r.state === "getting-to-know") {
      expect(r.sessionsSoFar).toBe(4);
      expect(r.sessionsNeeded).toBe(10);
    }
  });

  it("is 'getting-to-know' with 10+ sessions but fewer than 3 windows", () => {
    const events = [...sessionStarts(12), ...DOMAINS.flatMap((d) => [activityAt(1, 9, d, 0), activityAt(2, 10, d, 0)])];
    const r = computeRhythm(events, NOW);
    expect(r.state).toBe("getting-to-know");
    if (r.state === "getting-to-know") expect(r.windowsSoFar).toBe(1);
  });

  it("ignores activity older than the lookback window when counting windows", () => {
    const stale = DOMAINS.flatMap((d) => [activityAt(121, 9, d, 0), activityAt(121, 12, d, 0), activityAt(121, 20, d, 0)]);
    const events = [...sessionStarts(12), ...stale];
    const r = computeRhythm(events, NOW);
    expect(r.state).toBe("getting-to-know");
  });
});

describe("computeRhythm — flat profile", () => {
  it("reads as flat, with the honest fallback sentence, when nothing stands out", () => {
    const events = [
      ...sessionStarts(12),
      ...DOMAINS.flatMap((d) => [
        activityAt(1, 9, d, 2),
        activityAt(2, 9, d, 2),
        activityAt(1, 12, d, 2),
        activityAt(2, 12, d, 2),
        activityAt(1, 16, d, 2),
        activityAt(2, 16, d, 2),
      ]),
    ];
    const r = computeRhythm(events, NOW);
    expect(r.state).toBe("ready");
    if (r.state === "ready") {
      expect(r.flat).toBe(true);
      expect(r.sentence).toBe("She's fairly even through the day — no strong best or worst time yet.");
      expect(r.actionable).toHaveLength(0);
    }
  });
});

describe("computeRhythm — a real pattern", () => {
  const events = [
    ...sessionStarts(12),
    ...DOMAINS.flatMap((d) => [
      activityAt(1, 9, d, 0),
      activityAt(2, 9, d, 0),
      activityAt(1, 12, d, 2),
      activityAt(2, 12, d, 2),
      activityAt(1, 20, d, 4),
      activityAt(2, 20, d, 4),
    ]),
  ];
  const r = computeRhythm(events, NOW);

  it("names morning as best and evening as worst", () => {
    expect(r.state).toBe("ready");
    if (r.state === "ready") {
      expect(r.flat).toBe(false);
      expect(r.best).toBe("morning");
      expect(r.worst).toBe("evening");
    }
  });

  it("produces the exact plain sentence describing the gap", () => {
    if (r.state === "ready") {
      expect(r.sentence).toBe("Her best hour is around 9am. Evenings, she needs roughly three times the prompting for the same activity.");
    }
  });

  it("gives three actionable, family-facing suggestions", () => {
    if (r.state === "ready") {
      expect(r.actionable).toEqual([
        "Good times for anything demanding: mornings before 11",
        "Best time to book appointments: mid-morning",
        "Quieter activities suit the evening",
      ]);
    }
  });

  it("never names sundowning or any clinical subtype, anywhere in its output", () => {
    if (r.state !== "ready") throw new Error("expected ready state");
    const banned = /sundown|subtype|dementia|alzheimer|vascular|lewy|frontotemporal|diagnos/i;
    expect(r.sentence).not.toMatch(banned);
    for (const line of r.actionable) expect(line).not.toMatch(banned);
    for (const cell of r.cells) expect(cell.label).not.toMatch(banned);
  });

  it("labels every cell in plain words, including ones with no data", () => {
    if (r.state !== "ready") throw new Error("expected ready state");
    const thin = r.cells.find((c) => c.window === "afternoon");
    expect(thin?.count).toBe(0);
    expect(thin?.label).toMatch(/not enough of this yet to compare/);
    const morningCell = r.cells.find((c) => c.window === "morning" && c.domain === "memory");
    expect(morningCell?.label).toMatch(/much less help than her own average here/);
  });
});
