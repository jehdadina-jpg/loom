/**
 * The seven-question preparation: only answered questions ever produce a line, "new
 * behaviours" stays neutral with no explanation, and the free-text fields are never
 * paraphrased or dropped.
 */
import { describe, expect, it } from "vitest";
import { askQuestions, noticedLines, EMPTY_PREP, type PrepAnswers } from "../src/game/visit/prep";

describe("noticedLines", () => {
  it("is empty when nothing was answered", () => {
    expect(noticedLines(EMPTY_PREP)).toEqual([]);
  });

  it("includes only the questions that were actually answered", () => {
    const p: PrepAnswers = { ...EMPTY_PREP, sleep: "less", falls: "no" };
    const lines = noticedLines(p);
    expect(lines.map((l) => l.label)).toEqual(["Sleep", "Falls"]);
  });

  it("appends the optional note to sleep, mood and falls when one was written", () => {
    const p: PrepAnswers = { ...EMPTY_PREP, sleep: "awake", sleepNote: "Up most nights around 2am." };
    const line = noticedLines(p).find((l) => l.label === "Sleep")!;
    expect(line.text).toContain("Waking or restless at night.");
    expect(line.text).toContain("Up most nights around 2am.");
  });

  it("lists new behaviours neutrally, with no explanation of what they might mean", () => {
    const p: PrepAnswers = { ...EMPTY_PREP, behaviours: ["wandering", "suspicion"] };
    const line = noticedLines(p).find((l) => l.label === "New behaviours")!;
    expect(line.text).toBe("Wandering or getting lost, Suspicion or accusations.");
    expect(line.text).not.toMatch(/means|indicat|suggest|likely|risk|could be/i);
  });

  it("reports 'none of these' plainly when that's what was chosen", () => {
    const p: PrepAnswers = { ...EMPTY_PREP, behaviours: ["none"] };
    const line = noticedLines(p).find((l) => l.label === "New behaviours")!;
    expect(line.text).toBe("None of these.");
  });

  it("never explains or interprets any answer", () => {
    const p: PrepAnswers = {
      ...EMPTY_PREP,
      sleep: "less",
      appetite: "losing-weight",
      mood: "anxious",
      falls: "yes",
      medicineIssue: "side-effects",
      behaviours: ["hallucinations", "not-recognising"],
    };
    const banned = /diagnos|alzheimer|dementia|severe|moderate|mild cognitive impairment|probability|risk score|decline|sundown|subtype/i;
    for (const l of noticedLines(p)) expect(l.text).not.toMatch(banned);
  });
});

describe("askQuestions", () => {
  it("drops blank lines and trims whitespace, keeping order", () => {
    const p: PrepAnswers = { ...EMPTY_PREP, questions: ["  Is this normal for her age?  ", "", "Can we adjust the evening dose?"] };
    expect(askQuestions(p)).toEqual(["Is this normal for her age?", "Can we adjust the evening dose?"]);
  });

  it("is empty when nothing was written", () => {
    expect(askQuestions(EMPTY_PREP)).toEqual([]);
  });
});
