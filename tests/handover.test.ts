/**
 * The handover card's derivation logic: honest gating on "best times", a capped and
 * composed "she responds to" list, real medicine reminders only, and a clean WhatsApp-ready
 * text export.
 */
import { describe, expect, it } from "vitest";
import { bestTimesText, respondsToLines, medicineLines, seedIfUpset, handoverShareText, type HandoverDraft } from "../src/game/handover/handover";
import type { RhythmResult } from "../src/game/rhythm/rhythm";
import type { PreservedItem } from "../src/game/today/preserved";
import type { VaultReading } from "../src/game/vault/engagement";
import type { Reminder } from "../src/game/reminders/model";

const GETTING_TO_KNOW_RHYTHM: RhythmResult = { state: "getting-to-know", sessionsSoFar: 3, windowsSoFar: 1, sessionsNeeded: 10, windowsNeeded: 3 };
const FLAT_RHYTHM: RhythmResult = { state: "ready", cells: [], overall: { morning: 0, midday: 0, afternoon: 0, evening: 0 }, flat: true, best: null, worst: null, sentence: "She's fairly even through the day — no strong best or worst time yet.", actionable: [] };
const READY_RHYTHM: RhythmResult = {
  state: "ready",
  cells: [],
  overall: { morning: 0.5, midday: 0, afternoon: 0, evening: -0.5 },
  flat: false,
  best: "morning",
  worst: "evening",
  sentence: "Her best hour is around 9am. Evenings, she needs roughly twice the prompting for the same activity.",
  actionable: ["Good times for anything demanding: mornings before 11"],
};

const NOT_READY_VAULT: VaultReading = { state: "getting-to-know", visitsSoFar: 1, visitsNeeded: 5, gaps: [] };
const READY_VAULT: VaultReading = {
  state: "ready",
  respondsTo: [
    { item: { id: "p1", kind: "photo", label: "Wedding photograph" }, phrase: "settles her every time" },
    { item: { id: "song", kind: "song", label: "The comfort song" }, phrase: "reliably engaged with" },
  ],
  lessSo: [],
  gaps: [],
};

describe("bestTimesText", () => {
  it("is honest about still learning her rhythm", () => {
    expect(bestTimesText(GETTING_TO_KNOW_RHYTHM)).toBe("Still learning her rhythm — 3 of 10 sessions so far.");
  });

  it("says there's no strong best time when the profile is flat", () => {
    expect(bestTimesText(FLAT_RHYTHM)).toBe("No strong best time yet — she's fairly even through the day.");
  });

  it("carries the rhythm map's own plain sentence once there's a real pattern", () => {
    expect(bestTimesText(READY_RHYTHM)).toBe(READY_RHYTHM.sentence);
  });
});

describe("respondsToLines", () => {
  it("is empty with nothing preserved and nothing in the vault yet", () => {
    expect(respondsToLines([], NOT_READY_VAULT)).toEqual([]);
  });

  it("leads with the strongest preserved skill, then vault items, real labels only", () => {
    const preserved: PreservedItem[] = [{ id: "a", text: "Puts every step of making tea in the right order, without help." }];
    const out = respondsToLines(preserved, READY_VAULT);
    expect(out[0]).toBe("Puts every step of making tea in the right order, without help.");
    expect(out).toContain("Wedding photograph");
    expect(out).toContain("The comfort song");
  });

  it("caps the list at four lines", () => {
    const preserved: PreservedItem[] = [{ id: "a", text: "Lead line." }];
    const vault: VaultReading = {
      state: "ready",
      respondsTo: Array.from({ length: 6 }, (_, i) => ({ item: { id: `p${i}`, kind: "photo" as const, label: `Photo ${i}` }, phrase: "x" })),
      lessSo: [],
      gaps: [],
    };
    expect(respondsToLines(preserved, vault)).toHaveLength(4);
  });
});

describe("medicineLines", () => {
  const med = (label: string): Reminder => ({
    id: label,
    category: "medicine",
    label,
    schedule: { kind: "daily", times: ["08:00"] },
    photo: null,
    escalate: true,
    createdAt: 0,
  });
  const hydration: Reminder = { id: "h", category: "hydration", label: "Water", schedule: { kind: "daily", times: ["10:00"] }, photo: null, escalate: false, createdAt: 0 };

  it("says plainly when nothing is set", () => {
    expect(medicineLines([])).toEqual(["No medicine reminders set in LOOM."]);
  });

  it("only includes medicine-category reminders, never hydration or other kinds", () => {
    const out = medicineLines([med("The white tablet"), hydration]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("The white tablet");
  });
});

describe("seedIfUpset", () => {
  it("falls back to a generic suggestion with no vault data", () => {
    expect(seedIfUpset(NOT_READY_VAULT)).toBe("Usually music helps, and a quiet place like the water point is often good too.");
  });

  it("uses the vault's own top non-photo item when one exists", () => {
    expect(seedIfUpset(READY_VAULT)).toBe("Usually the comfort song helps, and a quiet place like the water point is often good too.");
  });
});

describe("handoverShareText", () => {
  it("produces a clean, section-labelled WhatsApp-ready message", () => {
    const draft: HandoverDraft = {
      bestTimes: "Her best hour is around 9am.",
      respondsTo: ["Wedding photograph"],
      avoid: ["Rushing her"],
      people: ["Rimi — daughter, most Sundays"],
      ifUpset: "Usually music helps.",
      medicines: ["The white tablet — Every day at 8:00 AM"],
      oneThing: "She had a rough night.",
    };
    const text = handoverShareText("Kamala", draft);
    expect(text).toContain("Looking after Kamala — what helps");
    expect(text).toContain("BEST TIMES\nHer best hour is around 9am.");
    expect(text).toContain("SHE RESPONDS TO\n• Wedding photograph");
    expect(text).toContain("AVOID\n• Rushing her");
    expect(text).toContain("HER PEOPLE\n• Rimi — daughter, most Sundays");
    expect(text).toContain("IF SHE'S UPSET\nUsually music helps.");
    expect(text).toContain("MEDICINES\n• The white tablet — Every day at 8:00 AM");
    expect(text).toContain("ONE THING TO KNOW\nShe had a rough night.");
  });

  it("says plainly when a free-text section hasn't been filled in, rather than inventing content", () => {
    const empty: HandoverDraft = { bestTimes: "x", respondsTo: [], avoid: [], people: [], ifUpset: "", medicines: [], oneThing: "" };
    const text = handoverShareText("Kamala", empty);
    expect(text).toContain("Not filled in yet.");
    expect(text).not.toMatch(/\bRimi\b|\bBimal\b/);
  });
});
