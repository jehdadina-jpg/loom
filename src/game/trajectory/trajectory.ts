/**
 * TRAJECTORY — each person against their own baseline, and nothing else.
 *
 * The measure is how independently activities were done in each domain (1 = on their
 * own, 0 = hands-on help), taken from the help each activity needed. The baseline is the
 * person's own first BASELINE_DAYS days with data. There are no population norms here.
 *
 * Nothing in this file names a condition or puts a number on likelihood. Its most serious
 * output is a suggestion that a doctor would be worth talking to. Until BASELINE_DAYS
 * days exist it refuses to say anything at all — no trend, no triage, no ranking.
 */
import { DOMAINS, DOMAIN_NAMES, type CognitiveDomain } from "../../data/domains";
import type { HealthWorkerEvent } from "../../health-worker/boundary";

export const BASELINE_DAYS = 14;
const DAY = 86_400_000;
/** A spread floor, so a very consistent start doesn't make every small wobble look like a shift. */
const MIN_SPREAD = 0.08;

export type DomainPattern = "sharp-change" | "sustained-shift" | "drifting" | "high-variance" | "stable";
export type Triage = "refer" | "monitor" | "continue" | "wait";

export interface DayPoint {
  day: number;
  value: number;
}

export interface DomainTrajectory {
  domain: CognitiveDomain;
  daily: DayPoint[];
  baseline: { mean: number; spread: number; from: number; to: number } | null;
  /** Rolling 7-day low/mean/high — variance is shown, not smoothed away. */
  rolling: { day: number; low: number; mean: number; high: number }[];
  pattern: DomainPattern;
  /** When the movement began, if there is one. */
  since: number | null;
  /** Recent mean minus baseline mean; negative means more help than usual. */
  shift: number;
  /** Change per week over the last four weeks. */
  slopePerWeek: number;
}

export type Trajectory =
  | { state: "getting-to-know"; daysSoFar: number; daysNeeded: number; firstDay: number | null }
  | {
      state: "ready";
      firstDay: number;
      baselineEnds: number;
      domains: DomainTrajectory[];
      triage: Exclude<Triage, "wait">;
      /** Short reason for list views, e.g. "sharp change, 9 days". */
      reason: string;
      moved: DomainTrajectory[];
      /** For sorting a list: most negative first. */
      slope: number;
    };

const startOfDay = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const spread = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
};

function slope(points: DayPoint[]): number {
  if (points.length < 4) return 0;
  const xs = points.map((p) => p.day / DAY);
  const ys = points.map((p) => p.value);
  const mx = mean(xs);
  const my = mean(ys);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den ? xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den : 0;
}

export function dataDays(events: HealthWorkerEvent[]): number[] {
  return [...new Set(events.filter((e) => e.kind === "activity").map((e) => startOfDay(e.t)))].sort((a, b) => a - b);
}

export function computeTrajectory(events: HealthWorkerEvent[], now = Date.now()): Trajectory {
  const activities = events.filter((e): e is Extract<HealthWorkerEvent, { kind: "activity" }> => e.kind === "activity");
  const days = dataDays(events);
  if (days.length < BASELINE_DAYS) {
    return { state: "getting-to-know", daysSoFar: days.length, daysNeeded: BASELINE_DAYS, firstDay: days[0] ?? null };
  }

  const baselineEnds = days[BASELINE_DAYS - 1];
  const today = startOfDay(now);

  const domains = DOMAINS.map((domain): DomainTrajectory => {
    const byDay = new Map<number, number[]>();
    for (const a of activities) {
      if (a.domain !== domain) continue;
      const d = startOfDay(a.t);
      byDay.set(d, [...(byDay.get(d) ?? []), 1 - Math.min(4, Math.max(0, a.cue)) / 4]);
    }
    const daily = [...byDay.entries()].map(([day, vs]) => ({ day, value: mean(vs) })).sort((a, b) => a.day - b.day);

    const rolling = daily.map((p) => {
      const win = daily.filter((q) => q.day > p.day - 7 * DAY && q.day <= p.day).map((q) => q.value);
      return { day: p.day, low: Math.min(...win), mean: mean(win), high: Math.max(...win) };
    });

    const base = daily.filter((p) => p.day <= baselineEnds).map((p) => p.value);
    if (base.length < 3) {
      return { domain, daily, baseline: null, rolling, pattern: "stable", since: null, shift: 0, slopePerWeek: 0 };
    }
    const baseMean = mean(base);
    const baseSpread = Math.max(MIN_SPREAD, spread(base));
    const baseline = { mean: baseMean, spread: baseSpread, from: days[0], to: baselineEnds };

    const after = daily.filter((p) => p.day > baselineEnds);
    const last14 = after.filter((p) => p.day > today - 14 * DAY);
    const last28 = after.filter((p) => p.day > today - 28 * DAY);
    const shift = last14.length ? mean(last14.map((p) => p.value)) - baseMean : 0;
    const slopePerWeek = slope(last28) * 7;

    let pattern: DomainPattern = "stable";
    let since: number | null = null;

    // sustained: whole weeks sitting clearly below their own usual, counted back from now
    let weeksBelow = 0;
    for (let w = 0; w < 12; w++) {
      const week = after.filter((p) => p.day > today - (w + 1) * 7 * DAY && p.day <= today - w * 7 * DAY);
      if (week.length < 2 || mean(week.map((p) => p.value)) > baseMean - Math.max(baseSpread, 0.12)) break;
      weeksBelow++;
    }

    // sharp: a recent run far below usual, where the stretch just before it was still usual
    const recentRun: DayPoint[] = [];
    for (let i = after.length - 1; i >= 0; i--) {
      if (after[i].value < baseMean - Math.max(2 * baseSpread, 0.2)) recentRun.unshift(after[i]);
      else break;
    }
    const runStart = recentRun[0]?.day;
    const before = runStart ? after.filter((p) => p.day < runStart && p.day >= runStart - 14 * DAY) : [];
    const beforeUsual = before.length >= 3 && mean(before.map((p) => p.value)) > baseMean - baseSpread;

    const recentSpread = spread(last14.map((p) => p.value));

    if (recentRun.length >= 3 && beforeUsual && runStart! > today - 21 * DAY) {
      pattern = "sharp-change";
      since = runStart!;
    } else if (weeksBelow >= 3) {
      pattern = "sustained-shift";
      since = today - weeksBelow * 7 * DAY;
    } else if (slopePerWeek < -0.04 && shift < -0.06) {
      pattern = "drifting";
      since = last28[0]?.day ?? null;
    } else if (last14.length >= 5 && recentSpread > Math.max(1.8 * baseSpread, 0.15)) {
      pattern = "high-variance";
      since = last14[0].day;
    }

    return { domain, daily, baseline, rolling, pattern, since, shift, slopePerWeek };
  });

  const moved = domains.filter((d) => d.pattern !== "stable");
  const has = (p: DomainPattern) => moved.filter((d) => d.pattern === p);
  const sharp = has("sharp-change");
  const sustained = has("sustained-shift");

  let triage: Exclude<Triage, "wait"> = "continue";
  let reason = "steady";
  if (sharp.length) {
    triage = "refer";
    reason = `sharp change, ${Math.round((today - Math.min(...sharp.map((d) => d.since!))) / DAY) + 1} days`;
  } else if (sustained.length) {
    triage = "refer";
    reason = `below own baseline ${Math.round((today - Math.min(...sustained.map((d) => d.since!))) / (7 * DAY))} weeks`;
  } else if (has("drifting").length) {
    triage = "monitor";
    reason = "drifting, watch";
  } else if (has("high-variance").length) {
    triage = "monitor";
    reason = "more ups and downs than usual";
  }

  return {
    state: "ready",
    firstDay: days[0],
    baselineEnds,
    domains,
    triage,
    reason,
    moved,
    // rate of change per week: a big move over a few days is steeper than a small one over months
    slope: Math.min(
      0,
      ...domains.map((d) => {
        if (!d.baseline || !d.since || d.pattern === "stable") return d.slopePerWeek;
        const since = d.daily.filter((p) => p.day >= d.since!).map((p) => p.value);
        const weeks = Math.max(1, (today - d.since) / (7 * DAY));
        return since.length ? (mean(since) - d.baseline.mean) / weeks : d.slopePerWeek;
      }),
    ),
  };
}

// ---------------------------------------------------------------- plain language

export interface Words {
  name: string;
  subject: string;
  object: string;
  possessive: string;
}

const lower = (d: CognitiveDomain) => DOMAIN_NAMES[d].toLowerCase();

function listDomains(ds: DomainTrajectory[]): string {
  const names = ds.map((d) => lower(d.domain));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
}

export function formatDay(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * The one sentence that goes on every screen and into the referral. It describes what
 * changed against the person's own record and, at most, suggests a conversation.
 */
export function trajectorySentence(t: Trajectory, w: Words): string {
  if (t.state === "getting-to-know") {
    return `Still getting to know ${w.object} — ${t.daysSoFar} of ${t.daysNeeded} days so far. No trend is shown until then.`;
  }
  const sharp = t.moved.filter((d) => d.pattern === "sharp-change");
  const sustained = t.moved.filter((d) => d.pattern === "sustained-shift");
  const drifting = t.moved.filter((d) => d.pattern === "drifting");
  const varied = t.moved.filter((d) => d.pattern === "high-variance");
  const activities = (ds: DomainTrajectory[]) => `${listDomains(ds)} activities have`;

  if (sharp.length) {
    const since = Math.min(...sharp.map((d) => d.since!));
    return `Since ${formatDay(since)}, ${activities(sharp)} needed clearly more help than in ${w.possessive} own first weeks, and the change came quickly. It would be worth sharing this with a doctor.`;
  }
  if (sustained.length) {
    const since = Math.min(...sustained.map((d) => d.since!));
    return `Since ${formatDay(since)}, ${activities(sustained)} needed more help than ${w.possessive} own usual, week after week. It would be worth sharing this with a doctor.`;
  }
  if (drifting.length) {
    return `Over the last month, ${activities(drifting)} gradually needed a little more help than ${w.possessive} own usual. Worth keeping an eye on.`;
  }
  if (varied.length) {
    return `Good days and harder days in ${listDomains(varied)} activities have been further apart than usual for ${w.object} lately. Worth keeping an eye on.`;
  }
  return `Activities have stayed close to ${w.possessive} own usual pattern.`;
}

export const TRIAGE_WORD: Record<Triage, string> = {
  refer: "REFER",
  monitor: "MONITOR",
  continue: "CONTINUE",
  wait: "WAIT",
};

export const PATTERN_WORDS: Record<DomainPattern, string> = {
  "sharp-change": "changed quickly",
  "sustained-shift": "below own baseline for weeks",
  drifting: "drifting gradually",
  "high-variance": "more ups and downs",
  stable: "close to own usual",
};
