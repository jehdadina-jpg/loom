/**
 * Steadiness: day-to-day variance surfaced on its own, compared only against this person's
 * own earlier weeks. Never a subtype — just the pattern, in plain words.
 */
import { describe, expect, it } from "vitest";
import { computeSteadiness } from "../src/game/trajectory/steadiness";
import type { HealthWorkerEvent } from "../src/health-worker/boundary";

const DAY = 86_400_000;
const NOW = new Date(2026, 8, 17, 12, 0).getTime();

function activityAt(daysAgo: number, cue: number): HealthWorkerEvent {
  return { kind: "activity", t: NOW - daysAgo * DAY, domain: "attention", cue, elapsedMs: 20_000 };
}

/** `cuesByDay[i]` are the cue values logged `i` days ago (today = 0). */
function fromDays(cuesByDay: number[][]): HealthWorkerEvent[] {
  return cuesByDay.flatMap((cues, daysAgo) => cues.map((cue) => activityAt(daysAgo, cue)));
}

describe("computeSteadiness — gating", () => {
  it("is not-enough with no activity at all", () => {
    expect(computeSteadiness([], NOW)).toEqual({ state: "not-enough" });
  });

  it("is not-enough without a full two months of comparable history", () => {
    // only 10 days of any history — nowhere near two 28-day windows
    const events = fromDays(Array.from({ length: 10 }, () => [1, 2]));
    expect(computeSteadiness(events, NOW).state).toBe("not-enough");
  });
});

describe("computeSteadiness — same average, wider spread", () => {
  it("names a widened spread with a stable mean", () => {
    const cuesByDay: number[][] = [];
    // prior month (days 35-56 ago): consistently around cue 2, tight spread
    for (let d = 35; d <= 56; d++) cuesByDay[d] = [2, 2, 2];
    // recent month (days 0-27 ago): same rough average (2), but much wider day-to-day spread
    for (let d = 0; d <= 27; d++) cuesByDay[d] = d % 2 === 0 ? [0, 0, 0] : [4, 4, 4];
    const events = fromDays(cuesByDay);
    const r = computeSteadiness(events, NOW);
    expect(r.state).toBe("ready");
    if (r.state === "ready") {
      expect(r.widened).toBe(true);
      expect(r.sentence).toBe("Her days are more different from each other than they were a month ago — same average, wider spread.");
    }
  });
});

describe("computeSteadiness — widened spread with a shifted mean", () => {
  it("says the average has moved too, rather than claiming it stayed the same", () => {
    const cuesByDay: number[][] = [];
    for (let d = 35; d <= 56; d++) cuesByDay[d] = [0, 0, 0]; // prior: steady, fully independent
    for (let d = 0; d <= 27; d++) cuesByDay[d] = d % 2 === 0 ? [0, 0, 0] : [4, 4, 4]; // recent: wide swings, and a lower average overall
    const events = fromDays(cuesByDay);
    const r = computeSteadiness(events, NOW);
    expect(r.state).toBe("ready");
    if (r.state === "ready") {
      expect(r.meanStable).toBe(false);
      expect(r.sentence).toContain("the average has shifted too");
    }
  });
});

describe("computeSteadiness — no notable change", () => {
  it("says her consistency has stayed about the same", () => {
    const cuesByDay: number[][] = [];
    for (let d = 0; d <= 56; d++) cuesByDay[d] = [1, 2, 1];
    const events = fromDays(cuesByDay);
    const r = computeSteadiness(events, NOW);
    expect(r.state).toBe("ready");
    if (r.state === "ready") {
      expect(r.widened).toBe(false);
      expect(r.sentence).toBe("Her day-to-day consistency has stayed about the same as a month ago.");
    }
  });
});

describe("computeSteadiness — the band-over-time data", () => {
  it("bins activity into weekly points spanning the full history", () => {
    const cuesByDay: number[][] = [];
    for (let d = 0; d <= 56; d++) cuesByDay[d] = [1, 2];
    const events = fromDays(cuesByDay);
    const r = computeSteadiness(events, NOW);
    expect(r.state).toBe("ready");
    if (r.state === "ready") {
      expect(r.weeks.length).toBeGreaterThan(1);
      for (const w of r.weeks) {
        expect(w.mean).toBeGreaterThanOrEqual(0);
        expect(w.mean).toBeLessThanOrEqual(1);
        expect(w.spread).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("never names sundowning, a subtype, or a diagnosis in its sentence", () => {
    const cuesByDay: number[][] = [];
    for (let d = 35; d <= 56; d++) cuesByDay[d] = [2, 2, 2];
    for (let d = 0; d <= 27; d++) cuesByDay[d] = d % 2 === 0 ? [0, 0, 0] : [4, 4, 4];
    const events = fromDays(cuesByDay);
    const r = computeSteadiness(events, NOW);
    if (r.state === "ready") {
      expect(r.sentence).not.toMatch(/sundown|subtype|dementia|alzheimer|vascular|lewy|frontotemporal|diagnos/i);
    }
  });
});
