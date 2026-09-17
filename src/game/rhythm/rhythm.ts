/**
 * TIME-OF-DAY PERFORMANCE MAP — five cognitive domains against four windows of the day,
 * each window read only against this person's own average. Never an absolute score, never
 * a comparison to anyone else, and never a clinical label: this shows the pattern in plain
 * words and leaves interpreting it to a clinician. See src/components/charts/RhythmHeatmap
 * for the chart itself — this file only computes and describes.
 */
import { DOMAINS, DOMAIN_NAMES, type CognitiveDomain } from "../../data/domains";
import type { HealthWorkerEvent } from "../../health-worker/boundary";

export type Window = "morning" | "midday" | "afternoon" | "evening";

export const WINDOWS: Window[] = ["morning", "midday", "afternoon", "evening"];

export const WINDOW_LABEL: Record<Window, string> = {
  morning: "Morning (5–11am)",
  midday: "Midday (11am–3pm)",
  afternoon: "Afternoon (3–6pm)",
  evening: "Evening (6pm–5am)",
};

/** A clock time worth naming in a sentence — the middle of each window, in plain words. */
const REPRESENTATIVE_TIME: Record<Window, string> = {
  morning: "around 9am",
  midday: "around midday",
  afternoon: "around 4pm",
  evening: "in the evening",
};

export function windowOf(t: number): Window {
  const h = new Date(t).getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 15) return "midday";
  if (h >= 15 && h < 18) return "afternoon";
  return "evening";
}

const MIN_SESSIONS = 10;
const MIN_WINDOWS = 3;
/** Below this, two windows read as "about the same" rather than one being named best/worst. */
const FLAT_THRESHOLD = 0.12;

export interface Cell {
  domain: CognitiveDomain;
  window: Window;
  /** Independence in this window minus this domain's own overall average; null with too little data for this cell alone. */
  relative: number | null;
  /** How many completions this cell is built from. */
  count: number;
  label: string;
}

export type RhythmResult =
  | { state: "getting-to-know"; sessionsSoFar: number; windowsSoFar: number; sessionsNeeded: number; windowsNeeded: number }
  | {
      state: "ready";
      cells: Cell[];
      /** Overall independence per window, averaged across domains — what the sentence and chart lead with. */
      overall: Record<Window, number | null>;
      flat: boolean;
      best: Window | null;
      worst: Window | null;
      sentence: string;
      actionable: string[];
    };

function independence(cue: number): number {
  return 1 - Math.min(4, Math.max(0, cue)) / 4;
}

/** "about twice", "a little more", "close to three times" — a ratio in words, never a raw decimal. */
function ratioWord(ratio: number): string {
  if (ratio < 1.15) return "a little more";
  if (ratio < 1.35) return "around a third more";
  if (ratio < 1.75) return "around half as much again";
  if (ratio < 2.4) return "roughly twice";
  if (ratio < 3.4) return "roughly three times";
  return "several times";
}

/** How far back the pattern looks — long enough to be a real rhythm, not stale forever. */
const LOOKBACK_MS = 120 * 86_400_000;

export function computeRhythm(events: HealthWorkerEvent[], now = Date.now()): RhythmResult {
  const activities = events.filter(
    (e): e is Extract<HealthWorkerEvent, { kind: "activity" }> => e.kind === "activity" && now - e.t <= LOOKBACK_MS,
  );
  const sessionsSoFar = events.filter((e) => e.kind === "session_start").length;
  const windowsSoFar = new Set(activities.map((a) => windowOf(a.t))).size;

  if (sessionsSoFar < MIN_SESSIONS || windowsSoFar < MIN_WINDOWS) {
    return { state: "getting-to-know", sessionsSoFar, windowsSoFar, sessionsNeeded: MIN_SESSIONS, windowsNeeded: MIN_WINDOWS };
  }

  // this domain's own overall average — the "her" the whole chart is relative to
  const domainAverage = new Map<CognitiveDomain, number>();
  for (const d of DOMAINS) {
    const vals = activities.filter((a) => a.domain === d).map((a) => independence(a.cue));
    if (vals.length) domainAverage.set(d, vals.reduce((s, v) => s + v, 0) / vals.length);
  }

  const cells: Cell[] = [];
  const windowTotals: Record<Window, number[]> = { morning: [], midday: [], afternoon: [], evening: [] };

  for (const domain of DOMAINS) {
    const avg = domainAverage.get(domain);
    for (const window of WINDOWS) {
      const inCell = activities.filter((a) => a.domain === domain && windowOf(a.t) === window);
      const relative = avg !== undefined && inCell.length ? inCell.reduce((s, a) => s + independence(a.cue), 0) / inCell.length - avg : null;
      if (relative !== null) windowTotals[window].push(relative);
      cells.push({
        domain,
        window,
        relative,
        count: inCell.length,
        label:
          inCell.length === 0
            ? `${DOMAIN_NAMES[domain]}, ${WINDOW_LABEL[window]}: not enough of this yet to compare.`
            : `${DOMAIN_NAMES[domain]}, ${WINDOW_LABEL[window]}: ${cellWords(relative!)}.`,
      });
    }
  }

  const overall: Record<Window, number | null> = { morning: null, midday: null, afternoon: null, evening: null };
  for (const w of WINDOWS) if (windowTotals[w].length) overall[w] = windowTotals[w].reduce((s, v) => s + v, 0) / windowTotals[w].length;

  const known = WINDOWS.filter((w) => overall[w] !== null);
  let best: Window | null = null;
  let worst: Window | null = null;
  for (const w of known) {
    if (best === null || overall[w]! > overall[best]!) best = w;
    if (worst === null || overall[w]! < overall[worst]!) worst = w;
  }
  const spread = best && worst ? overall[best]! - overall[worst]! : 0;
  const flat = !best || !worst || best === worst || spread < FLAT_THRESHOLD;

  let sentence: string;
  const actionable: string[] = [];
  if (flat || !best || !worst) {
    sentence = "She's fairly even through the day — no strong best or worst time yet.";
  } else {
    // cue level (0-4) rather than independence, so the ratio reads as "help needed", matching the example
    const cueAt = (w: Window) => 4 * (1 - overall[w]!);
    const bestCue = Math.max(0.3, cueAt(best));
    const worstCue = Math.max(0.3, cueAt(worst));
    const ratio = worstCue / bestCue;
    sentence =
      ratio > 1.15
        ? `Her best hour is ${REPRESENTATIVE_TIME[best]}. ${WINDOW_LABEL[worst].split(" (")[0]}s, she needs ${ratioWord(ratio)} the prompting for the same activity.`
        : `Her best hour is ${REPRESENTATIVE_TIME[best]}, with ${WINDOW_LABEL[worst].split(" (")[0].toLowerCase()}s only a little further back.`;
    actionable.push(`Good times for anything demanding: ${windowAdvice(best)}`);
    actionable.push(`Best time to book appointments: ${appointmentAdvice(best)}`);
    actionable.push(`Quieter activities suit ${windowAdvice(worst)}`);
  }

  return { state: "ready", cells, overall, flat, best, worst, sentence, actionable };
}

function cellWords(relative: number): string {
  if (relative > 0.18) return "much less help than her own average here";
  if (relative > 0.06) return "a little less help than her own average here";
  if (relative < -0.18) return "much more help than her own average here";
  if (relative < -0.06) return "a little more help than her own average here";
  return "about her own average here";
}

function appointmentAdvice(w: Window): string {
  switch (w) {
    case "morning":
      return "mid-morning";
    case "midday":
      return "just before midday";
    case "afternoon":
      return "just after lunch";
    case "evening":
      return "early evening";
  }
}

function windowAdvice(w: Window): string {
  switch (w) {
    case "morning":
      return "mornings before 11";
    case "midday":
      return "mid-morning to midday";
    case "afternoon":
      return "the early afternoon";
    case "evening":
      return "the evening";
  }
}
