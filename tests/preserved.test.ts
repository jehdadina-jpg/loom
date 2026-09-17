/**
 * "What she can still do": derived from real activity, never empty, never framed as loss.
 */
import { describe, expect, it } from "vitest";
import { derivePreserved, preservedShareText, type VaultContext } from "../src/game/today/preserved";
import { computeTrajectory } from "../src/game/trajectory/trajectory";
import type { TelemetryEvent } from "../src/game/telemetry/store";
import type { HealthWorkerEvent } from "../src/health-worker/boundary";

const DAY = 86_400_000;
const NOW = new Date(2026, 8, 17, 15, 0).getTime();
const she = { name: "Kamala", subject: "she", object: "her", possessive: "her" };

const EMPTY_VAULT: VaultContext = { photos: [], memories: [], familyVoiceLabel: null, comfortVisits: 0 };
const GETTING_TO_KNOW = computeTrajectory([], NOW);

function completion(activityId: string, domain: string, cueLevelReached: number, daysAgo: number): TelemetryEvent {
  return {
    type: "activity_complete",
    activityId,
    domain,
    attempts: 1,
    cueLevelReached,
    elapsedMs: 20_000,
    timestamp: NOW - daysAgo * DAY,
  };
}

function navigate(misses: number, daysAgo: number): TelemetryEvent {
  return { type: "navigate", to: "home", misses, elapsedMs: 4000, timestamp: NOW - daysAgo * DAY };
}

describe("derivePreserved", () => {
  it("is never empty, even with no data at all", () => {
    const items = derivePreserved([], GETTING_TO_KNOW, EMPTY_VAULT, she, NOW);
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].text.length).toBeGreaterThan(0);
  });

  it("names a repeatedly-mastered sequence activity in plain language", () => {
    const events = [1, 2, 3].map((d) => completion("hearth-sequence", "attention", 0, d));
    const items = derivePreserved(events, GETTING_TO_KNOW, EMPTY_VAULT, she, NOW);
    expect(items.some((i) => /puts every step of making tea in the right order, without help/i.test(i.text))).toBe(true);
  });

  it("does not credit an activity that needed help even once, or one seen fewer than three times", () => {
    const needsHelp = [1, 2, 3].map((d, i) => completion("hearth-sequence", "attention", i === 0 ? 1 : 0, d));
    expect(derivePreserved(needsHelp, GETTING_TO_KNOW, EMPTY_VAULT, she, NOW).some((i) => i.id.startsWith("activity-"))).toBe(false);

    const tooFew = [1, 2].map((d) => completion("hearth-sequence", "attention", 0, d));
    expect(derivePreserved(tooFew, GETTING_TO_KNOW, EMPTY_VAULT, she, NOW).some((i) => i.id.startsWith("activity-"))).toBe(false);
  });

  it("ignores completions outside the three-week window", () => {
    const stale = [22, 23, 24].map((d) => completion("hearth-sequence", "attention", 0, d));
    expect(derivePreserved(stale, GETTING_TO_KNOW, EMPTY_VAULT, she, NOW).some((i) => i.id.startsWith("activity-"))).toBe(false);
  });

  it("merges recognised faces into one sentence naming who, not one line per quiz", () => {
    const events = [
      ...[1, 2, 3].map((d) => completion("veranda-faces", "memory", 0, d)),
      ...[1, 2, 3].map((d) => completion("veranda-faces-deeplia", "memory", 0, d)),
    ];
    const items = derivePreserved(events, GETTING_TO_KNOW, EMPTY_VAULT, she, NOW);
    const faces = items.filter((i) => i.id === "faces");
    expect(faces).toHaveLength(1);
    expect(faces[0].text).toBe("Recognises Bimal and Deeplia by photograph, every time.");
  });

  it("names finding the way around only with enough navigation and a clean record", () => {
    const clean = [...Array(9)].map((_, i) => navigate(0, i)).concat(navigate(1, 9));
    expect(derivePreserved(clean, GETTING_TO_KNOW, EMPTY_VAULT, she, NOW).some((i) => i.id === "wayfinding")).toBe(true);

    const tooFew = [...Array(5)].map((_, i) => navigate(0, i));
    expect(derivePreserved(tooFew, GETTING_TO_KNOW, EMPTY_VAULT, she, NOW).some((i) => i.id === "wayfinding")).toBe(false);

    const messy = [...Array(10)].map((_, i) => navigate(i < 5 ? 1 : 0, i));
    expect(derivePreserved(messy, GETTING_TO_KNOW, EMPTY_VAULT, she, NOW).some((i) => i.id === "wayfinding")).toBe(false);
  });

  it("names a domain that has held its own pattern, only once a baseline exists", () => {
    // a steady 20-day record: computeTrajectory needs >= BASELINE_DAYS distinct days to leave getting-to-know
    const steadyEvents: HealthWorkerEvent[] = [];
    for (let d = 19; d >= 0; d--) {
      steadyEvents.push({ kind: "activity", t: NOW - d * DAY, domain: "attention", cue: 1, elapsedMs: 20000 });
    }
    const ready = computeTrajectory(steadyEvents, NOW);
    expect(ready.state).toBe("ready");
    const items = derivePreserved([], ready, EMPTY_VAULT, she, NOW);
    expect(items.some((i) => i.id === "domains-steady" && /attention/i.test(i.text))).toBe(true);
  });

  it("falls back to the vault when there is no play data yet, and never fabricates a count", () => {
    const vault: VaultContext = { photos: Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, dataUrl: "x", caption: "", addedAt: NOW })), memories: [], familyVoiceLabel: null, comfortVisits: 0 };
    const items = derivePreserved([], GETTING_TO_KNOW, vault, she, NOW);
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe("Has 5 family photographs kept just for her, saved by the family.");
  });

  it("tops up a thin real list with one vault line, without drowning it out", () => {
    const events = [1, 2, 3].map((d) => completion("hearth-sequence", "attention", 0, d));
    const vault: VaultContext = { photos: [{ id: "p1", dataUrl: "x", caption: "", addedAt: NOW }], memories: [], familyVoiceLabel: null, comfortVisits: 0 };
    const items = derivePreserved(events, GETTING_TO_KNOW, vault, she, NOW);
    expect(items).toHaveLength(2);
    expect(items.some((i) => i.id === "vault-photos")).toBe(true);
  });

  it("never frames anything as loss, decline or hedged as temporary", () => {
    const events = [
      ...[1, 2, 3].map((d) => completion("hearth-sequence", "attention", 0, d)),
      ...[1, 2, 3].map((d) => completion("veranda-faces", "memory", 0, d)),
      ...[1, 2, 3].map((d) => completion("market-count-fruit", "speed", 0, d)),
      ...[...Array(9)].map((_, i) => navigate(0, i)),
    ];
    const vault: VaultContext = {
      photos: [{ id: "p1", dataUrl: "x", caption: "", addedAt: NOW }],
      memories: [{ id: "m1", title: "t", note: "n", locationId: "home", timestamp: NOW }],
      familyVoiceLabel: "Bimal",
      comfortVisits: 5,
    };
    const items = derivePreserved(events, GETTING_TO_KNOW, vault, she, NOW);
    const banned = /\b(decline|declining|loss|losing|lost|still,? for now|no longer|used to|unable|can.?t\b|cannot|struggl\w*|impair\w*|deteriorat\w*)\b/i;
    for (const i of items) {
      expect(i.text).not.toMatch(banned);
      expect(i.text).not.toMatch(/%/);
      expect(i.text).not.toMatch(/\b\d+\s+of\s+\d+\b/i); // no fraction-style scoring, e.g. "4 of 5"
    }
  });
});

describe("preservedShareText", () => {
  it("produces a clean, plain-text message a caregiver can send straight to family", () => {
    const items = derivePreserved(
      [1, 2, 3].map((d) => completion("hearth-sequence", "attention", 0, d)),
      GETTING_TO_KNOW,
      EMPTY_VAULT,
      she,
      NOW,
    );
    const text = preservedShareText(items, she);
    expect(text).toContain("What Kamala can still do");
    expect(text).toContain("• Puts every step of making tea in the right order, without help.");
  });
});
