import { describe, expect, it } from "vitest";
import { RUDAS_ITEMS, rudasMessage, rudasTotal, startingBands, emptyScores, type RudasRecord } from "../src/game/clinical/rudas";
import { appChangedDrafts, referralDraft, reminderDrafts } from "../src/game/alerts/derive";
import { computeTrajectory } from "../src/game/trajectory/trajectory";
import { sampleVillage } from "../src/health-worker/sampleVillage";
import { shouldShowNotice, type Checkin } from "../src/game/wellbeing/checkin";
import type { Reminder } from "../src/game/reminders/model";

const NOW = new Date(2026, 8, 17, 15, 0).getTime();
const DAY = 86_400_000;
const words = { name: "Kamala", subject: "she", object: "her", possessive: "her" };

describe("RUDAS", () => {
  it("has the six items and maximums from the specification, totalling 30", () => {
    expect(RUDAS_ITEMS.map((i) => [i.label, i.max])).toEqual([
      ["Memory", 8],
      ["Body orientation", 5],
      ["Praxis", 2],
      ["Drawing", 3],
      ["Judgement", 4],
      ["Language", 8],
    ]);
    expect(rudasTotal({ memory: 99, bodyOrientation: 5, praxis: 2, drawing: 3, judgement: 4, language: 8 })).toBe(30);
  });

  it("says exactly one of two things, split at 22", () => {
    expect(rudasMessage(22)).toBe(
      "This score suggests a clinical assessment would be worthwhile. LOOM does not diagnose. Please share this with a doctor or health worker.",
    );
    expect(rudasMessage(23)).toBe("No immediate concern from this screen. LOOM does not diagnose.");
  });

  it("sets per-domain starting bands and never the fullest band at or below 22", () => {
    const record: RudasRecord = { id: "r", date: NOW, administeredBy: "", scores: { ...emptyScores(), memory: 8, language: 8, judgement: 4, praxis: 2 }, total: 22 };
    expect(Object.values(startingBands(record))).not.toContain("fuller");
    expect(startingBands({ ...record, scores: { ...record.scores, memory: 2 } }).memory).toBe("gentle");
  });
});

describe("alerts", () => {
  it("raises a referral only when the trajectory says so — never while still getting to know someone", () => {
    const village = sampleVillage(NOW);
    expect(referralDraft(computeTrajectory(village[0].events, NOW), words, NOW)?.kind).toBe("referral");
    expect(referralDraft(computeTrajectory(village[5].events, NOW), words, NOW)).toBeNull();
    expect(referralDraft(computeTrajectory(village[4].events, NOW), words, NOW)).toBeNull();
  });

  it("names a missed reminder once, for yesterday only — no running tally", () => {
    const reminder: Reminder = {
      id: "r1",
      category: "medicine",
      label: "the white tablet",
      schedule: { kind: "daily", times: ["20:00"] },
      photo: null,
      escalate: true,
      createdAt: NOW - 10 * DAY,
    };
    const drafts = reminderDrafts([reminder], [], NOW);
    expect(drafts.map((d) => d.sentence)).toEqual(["The white tablet (evening) wasn't marked done yesterday."]);
    expect(reminderDrafts([{ ...reminder, escalate: false }], [], NOW)).toEqual([]);
    expect(reminderDrafts([{ ...reminder, label: "evening medicine" }], [], NOW)[0].sentence).toBe("Evening medicine wasn't marked done yesterday.");
  });

  it("explains app changes that came from the person's own play, with a reason, and ignores set-up changes", () => {
    const before = { attention: { level: "standard", idleCueMs: 9000 }, memory: { level: "standard", idleCueMs: 9000 } };
    const after = {
      attention: { level: "standard", idleCueMs: 14000, levelReason: "", timeReason: "responses have been slower this week", fromHistory: true },
      memory: { level: "gentle", idleCueMs: 9000, levelReason: "the starting point was set from the RUDAS check-up", timeReason: "", fromHistory: false },
    };
    const drafts = appChangedDrafts(before, after, words, NOW);
    expect(drafts.map((d) => d.sentence)).toEqual([
      "Attention activities are giving her more time before offering a hint, because responses have been slower this week.",
    ]);
    expect(drafts[0].change).toEqual({ domain: "attention", from: { level: "standard", idleCueMs: 9000 }, to: { level: "standard", idleCueMs: 14000 } });
  });
});

describe("How are you?", () => {
  const easy = { "own-time": 3, stretched: 1, sleep: 3, health: 1, handover: 3 };
  const hard = { "own-time": 0, stretched: 4, sleep: 0, health: 4, handover: 0 };
  const week = (n: number, answers: Record<string, number>): Checkin => ({ id: `w${n}`, week: n * 7 * DAY, at: n * 7 * DAY, answers });

  it("mentions a rise once, not every week it stays high", () => {
    const risen = { checkins: [week(1, easy), week(2, easy), week(3, easy), week(4, hard)], skippedWeeks: [], noticesSeen: [] };
    expect(shouldShowNotice(risen)?.id).toBe("w4");
    expect(shouldShowNotice({ ...risen, noticesSeen: ["w4"] })).toBeNull();
    expect(shouldShowNotice({ ...risen, checkins: [...risen.checkins, week(5, hard)] })).toBeNull();
  });
});
