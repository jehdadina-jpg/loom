/**
 * "Things to talk about": specific, real, never a test, never referencing struggle.
 */
import { describe, expect, it } from "vitest";
import { talkAbout } from "../src/game/today/talk";
import { sessionRecords } from "../src/game/session/history";
import type { TelemetryEvent } from "../src/game/telemetry/store";

const NOW = new Date(2026, 8, 17, 15, 0).getTime();

function easySession(activityId: string, domain: string, sessionId: string, hoursAgo: number, parts: number): TelemetryEvent[] {
  const start = NOW - hoursAgo * 3_600_000;
  const out: TelemetryEvent[] = [{ type: "session_start", sessionId, activityId, chosenBy: "caregiver", timestamp: start }];
  for (let i = 0; i < parts; i++) {
    out.push({ type: "activity_attempt", activityId, correct: true, cueLevel: 0, timestamp: start + i * 1000 });
  }
  out.push({
    type: "activity_complete",
    activityId,
    domain,
    attempts: parts,
    cueLevelReached: 0,
    elapsedMs: 30_000,
    timestamp: start + parts * 1000,
  });
  out.push({ type: "session_end", sessionId, timestamp: start + parts * 1000 + 500 });
  return out;
}

function hardSession(activityId: string, domain: string, sessionId: string, hoursAgo: number): TelemetryEvent[] {
  const start = NOW - hoursAgo * 3_600_000;
  return [
    { type: "session_start", sessionId, activityId, chosenBy: "caregiver", timestamp: start },
    { type: "activity_attempt", activityId, correct: true, cueLevel: 3, timestamp: start + 1000 },
    { type: "activity_complete", activityId, domain, attempts: 1, cueLevelReached: 3, elapsedMs: 30_000, timestamp: start + 1500 },
    { type: "session_end", sessionId, timestamp: start + 2000 },
  ];
}

describe("talkAbout", () => {
  it("is empty with no session data yet", () => {
    expect(talkAbout([], [], NOW)).toEqual([]);
  });

  it("names who she recognised, from a real face-recognition activity, without help", () => {
    const events = easySession("veranda-faces", "memory", "s1", 2, 1);
    const records = sessionRecords(events);
    const prompts = talkAbout(records, events, NOW);
    expect(prompts.some((p) => p.text.includes("Bimal"))).toBe(true);
    expect(prompts.some((p) => /ask her about/i.test(p.text))).toBe(true);
  });

  it("names a completed sequence activity by its own title", () => {
    const events = easySession("hearth-sequence", "attention", "s1", 2, 4);
    const records = sessionRecords(events);
    const prompts = talkAbout(records, events, NOW);
    expect(prompts.some((p) => /making tea/i.test(p.text))).toBe(true);
  });

  it("never mentions a session that needed help", () => {
    const events = hardSession("hearth-sequence", "attention", "s1", 2);
    const records = sessionRecords(events);
    const prompts = talkAbout(records, events, NOW);
    expect(prompts).toHaveLength(0);
  });

  it("turns a conversation with a villager into a prompt naming who and where", () => {
    const events: TelemetryEvent[] = [{ type: "dialogue", npcId: "ramal", locationId: "veranda", timestamp: NOW - 3_600_000 }];
    const prompts = talkAbout([], events, NOW);
    expect(prompts.some((p) => p.text.includes("Ramal"))).toBe(true);
  });

  it("ignores anything outside the last few days", () => {
    const events = easySession("hearth-sequence", "attention", "s1", 24 * 20, 4);
    const records = sessionRecords(events);
    expect(talkAbout(records, events, NOW)).toHaveLength(0);
  });

  it("never phrases a prompt as testing memory, and never says 'does she remember'", () => {
    const events = [
      ...easySession("veranda-faces", "memory", "s1", 2, 1),
      ...easySession("hearth-sequence", "attention", "s2", 4, 4),
      { type: "dialogue" as const, npcId: "bimal", locationId: "veranda", timestamp: NOW - 5000 },
    ];
    const records = sessionRecords(events);
    const prompts = talkAbout(records, events, NOW);
    expect(prompts.length).toBeGreaterThan(0);
    const banned = /does she remember|do you remember|remember (this|that)|struggl|help(ed|ing)? with|wrong|mistake|test/i;
    for (const p of prompts) expect(p.text).not.toMatch(banned);
  });

  it("returns at most three prompts", () => {
    const events = [
      ...easySession("veranda-faces", "memory", "s1", 1, 1),
      ...easySession("hearth-sequence", "attention", "s2", 2, 4),
      ...easySession("veranda-weaving", "visuospatial", "s3", 3, 4),
      ...easySession("market-count-fruit", "speed", "s4", 4, 1),
    ];
    const records = sessionRecords(events);
    expect(talkAbout(records, events, NOW).length).toBeLessThanOrEqual(3);
  });
});
