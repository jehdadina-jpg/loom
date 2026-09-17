/**
 * STEADINESS — day-to-day variance in her own independence, tracked over time and compared
 * only against her own earlier weeks. A stable mean can hide a widening spread completely;
 * this surfaces the spread on its own, as a band width over time, not folded into an
 * average. Never a subtype — the pattern is shown in plain words, a clinician reads it.
 */
import type { HealthWorkerEvent } from "../../health-worker/boundary";

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const RECENT_MS = 28 * DAY;
const MIN_POINTS = 4;
const MIN_SPREAD = 0.06;
const WIDEN_RATIO = 1.4;
const MEAN_STABLE_WITHIN = 0.1;

function independence(cue: number): number {
  return 1 - Math.min(4, Math.max(0, cue)) / 4;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const spread = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
};
const startOfDay = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export interface WeekBand {
  day: number;
  mean: number;
  spread: number;
  n: number;
}

export type Steadiness =
  | { state: "not-enough" }
  | { state: "ready"; weeks: WeekBand[]; widened: boolean; meanStable: boolean; sentence: string };

export function computeSteadiness(events: HealthWorkerEvent[], now = Date.now()): Steadiness {
  const activities = events.filter((e): e is Extract<HealthWorkerEvent, { kind: "activity" }> => e.kind === "activity");
  if (!activities.length) return { state: "not-enough" };

  const byDay = new Map<number, number[]>();
  for (const a of activities) {
    const d = startOfDay(a.t);
    byDay.set(d, [...(byDay.get(d) ?? []), independence(a.cue)]);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);
  const firstDay = days[0];

  // weekly bins across the whole history — this is the band-width-over-time chart's data
  const weeks: WeekBand[] = [];
  for (let w = firstDay; w <= now; w += WEEK) {
    const vals = days.filter((d) => d >= w && d < w + WEEK).flatMap((d) => byDay.get(d)!);
    if (vals.length) weeks.push({ day: w, mean: mean(vals), spread: Math.max(MIN_SPREAD, spread(vals)), n: vals.length });
  }

  const recentVals = days.filter((d) => now - d <= RECENT_MS).flatMap((d) => byDay.get(d)!);
  const priorVals = days.filter((d) => now - d > RECENT_MS && now - d <= 2 * RECENT_MS).flatMap((d) => byDay.get(d)!);

  if (recentVals.length < MIN_POINTS || priorVals.length < MIN_POINTS) {
    return { state: "not-enough" };
  }

  const recentSpread = Math.max(MIN_SPREAD, spread(recentVals));
  const priorSpread = Math.max(MIN_SPREAD, spread(priorVals));
  const meanStable = Math.abs(mean(recentVals) - mean(priorVals)) < MEAN_STABLE_WITHIN;
  const widened = recentSpread > priorSpread * WIDEN_RATIO;

  let sentence: string;
  if (widened && meanStable) {
    sentence = "Her days are more different from each other than they were a month ago — same average, wider spread.";
  } else if (widened) {
    sentence = "Her days are more different from each other than they were a month ago, and the average has shifted too.";
  } else {
    sentence = "Her day-to-day consistency has stayed about the same as a month ago.";
  }

  return { state: "ready", weeks, widened, meanStable, sentence };
}
