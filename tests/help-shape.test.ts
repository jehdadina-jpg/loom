/**
 * Help shape: the cue-level distribution behind the average, never a subtype or a named
 * condition — just the shape, in plain words.
 */
import { describe, expect, it } from "vitest";
import { computeHelpShape } from "../src/game/trajectory/helpShape";
import type { HealthWorkerEvent } from "../src/health-worker/boundary";
import type { CognitiveDomain } from "../src/data/domains";

const DAY = 86_400_000;
const NOW = new Date(2026, 8, 17, 12, 0).getTime();

function activities(domain: CognitiveDomain, cues: number[], daysAgo = 1): HealthWorkerEvent[] {
  return cues.map((cue, i) => ({ kind: "activity" as const, t: NOW - daysAgo * DAY - i * 60_000, domain, cue, elapsedMs: 20_000 }));
}

describe("computeHelpShape — gating", () => {
  it("says plainly when nothing qualifies", () => {
    const r = computeHelpShape([], NOW);
    expect(r.headline).toBe("Not enough activity in the last three weeks yet to show a pattern.");
    expect(r.shapes.every((s) => s.sentence === null)).toBe(true);
  });

  it("leaves a thin domain's sentence null, but still gives it a count", () => {
    const events = activities("memory", [0, 1, 2]);
    const r = computeHelpShape(events, NOW);
    const memory = r.shapes.find((s) => s.domain === "memory")!;
    expect(memory.total).toBe(3);
    expect(memory.sentence).toBeNull();
  });

  it("ignores activity outside the three-week window", () => {
    const events = activities("memory", [0, 1, 2, 0, 1, 2, 0], 25);
    const r = computeHelpShape(events, NOW);
    const memory = r.shapes.find((s) => s.domain === "memory")!;
    expect(memory.total).toBe(0);
  });
});

describe("computeHelpShape — the three named shapes", () => {
  it("names the recognition-vs-recall pattern when cue level 2 dominates", () => {
    const events = activities("memory", [2, 2, 2, 2, 1, 0]);
    const r = computeHelpShape(events, NOW);
    const memory = r.shapes.find((s) => s.domain === "memory")!;
    expect(memory.sentence).toBe("She usually knows it once someone names it — recognition is holding up better than recall.");
  });

  it("names substantial guidance when most activity clusters at 3-4", () => {
    const events = activities("attention", [4, 4, 3, 3, 3, 2]);
    const r = computeHelpShape(events, NOW);
    const attention = r.shapes.find((s) => s.domain === "attention")!;
    expect(attention.sentence).toBe("Most activities are needing substantial guidance now.");
  });

  it("names mostly-independent-with-occasional-gone when low cues dominate but a few hit the ceiling", () => {
    const events = activities("language", [0, 0, 0, 0, 0, 1, 0, 4, 0, 0]);
    const r = computeHelpShape(events, NOW);
    const language = r.shapes.find((s) => s.domain === "language")!;
    expect(language.sentence).toBe("Usually independent, with occasional items that are simply gone.");
  });

  it("falls back to a neutral reading when nothing clusters", () => {
    const events = activities("speed", [0, 1, 2, 3, 4, 1]);
    const r = computeHelpShape(events, NOW);
    const speed = r.shapes.find((s) => s.domain === "speed")!;
    expect(speed.sentence).toBe("A mix of independent and guided attempts, without one pattern standing out.");
  });
});

describe("computeHelpShape — headline priority", () => {
  it("leads with the recognition-vs-recall finding over a merely-neutral or reassuring one", () => {
    const events = [...activities("memory", [2, 2, 2, 2, 1, 0]), ...activities("language", [0, 0, 0, 0, 0, 1, 0, 4, 0, 0])];
    const r = computeHelpShape(events, NOW);
    expect(r.headline).toContain("recognition is holding up better than recall");
  });

  it("leads with substantial-guidance over the occasional-gone case when both are present", () => {
    const events = [...activities("attention", [4, 4, 3, 3, 3, 2]), ...activities("language", [0, 0, 0, 0, 0, 1, 0, 4, 0, 0])];
    const r = computeHelpShape(events, NOW);
    expect(r.headline).toContain("substantial guidance");
  });

  it("never names sundowning, a subtype, or a diagnosis anywhere in its output", () => {
    const events = [
      ...activities("memory", [2, 2, 2, 2, 1, 0]),
      ...activities("attention", [4, 4, 3, 3, 3, 2]),
      ...activities("language", [0, 0, 0, 0, 0, 1, 0, 4, 0, 0]),
    ];
    const r = computeHelpShape(events, NOW);
    const banned = /sundown|subtype|dementia|alzheimer|vascular|lewy|frontotemporal|diagnos/i;
    expect(r.headline).not.toMatch(banned);
    for (const s of r.shapes) if (s.sentence) expect(s.sentence).not.toMatch(banned);
  });
});
