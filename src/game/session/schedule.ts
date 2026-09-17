import { ACTIVITIES, type ActivityDef, type CognitiveDomain } from "../../data/activities";
import type { TelemetryEvent } from "../telemetry/store";

export type DayPart = "morning" | "afternoon" | "evening";

export function dayPartAt(date: Date): DayPart {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  return "evening";
}

/** Activities that belong to the end of the day — lamps, fires, the quiet of the water. */
const EVENING_ACTIVITIES = new Set([
  "home-evening-order",
  "home-firewood",
  "veranda-evening-sound",
  "veranda-count-people",
  "community-fire",
  "water-pairs-quiet",
  "water-count-fish",
]);

const DOMAIN_WINDOWS: Record<CognitiveDomain, DayPart> = {
  memory: "morning",
  attention: "morning",
  language: "afternoon",
  visuospatial: "afternoon",
  speed: "afternoon",
};

/**
 * The part of the day an activity suits best. This only shapes what the app suggests —
 * a caregiver can start any activity at any hour.
 */
export function bestWindow(activity: ActivityDef): DayPart {
  return EVENING_ACTIVITIES.has(activity.id) ? "evening" : DOMAIN_WINDOWS[activity.domain];
}

const DOMAIN_WORDS: Record<CognitiveDomain, string> = {
  memory: "memory",
  attention: "step-by-step",
  language: "word and naming",
  visuospatial: "looking-and-finding",
  speed: "counting",
};

type Completion = Extract<TelemetryEvent, { type: "activity_complete" }>;

export interface Suggestion {
  activity: ActivityDef;
  /** One plain line on why — shown under the pick. */
  reason: string;
}

/**
 * Picks something that suits the time of day, leaning toward whatever kind of activity
 * has gone longest without a turn. The only history consulted is this person's own.
 */
export function suggestActivity(events: TelemetryEvent[], now: Date): Suggestion {
  const part = dayPartAt(now);
  const completions = events.filter((e): e is Completion => e.type === "activity_complete");

  const lastDone = new Map<string, number>();
  const lastDomain = new Map<CognitiveDomain, number>();
  for (const c of completions) {
    lastDone.set(c.activityId, c.timestamp);
    lastDomain.set(c.domain as CognitiveDomain, c.timestamp);
  }

  const inWindow = ACTIVITIES.filter((a) => bestWindow(a) === part);
  const candidates = inWindow.length ? inWindow : ACTIVITIES;
  // longest-rested domain first, then the activity within it done least recently;
  // the day of the month breaks ties so a fresh profile doesn't always get the same one
  const tieBreak = now.getDate();
  const ranked = [...candidates].sort((a, b) => {
    const byDomain = (lastDomain.get(a.domain) ?? 0) - (lastDomain.get(b.domain) ?? 0);
    if (byDomain !== 0) return byDomain;
    const byActivity = (lastDone.get(a.id) ?? 0) - (lastDone.get(b.id) ?? 0);
    if (byActivity !== 0) return byActivity;
    return ((ACTIVITIES.indexOf(a) + tieBreak) % candidates.length) - ((ACTIVITIES.indexOf(b) + tieBreak) % candidates.length);
  });
  const activity = ranked[0];

  return { activity, reason: ownHistoryReason(completions, part) ?? windowReason(part, activity) };
}

/** If this person's own record shows this part of the day going most easily, say so. */
function ownHistoryReason(completions: Completion[], part: DayPart): string | null {
  const byPart = new Map<DayPart, number[]>();
  for (const c of completions) {
    const p = dayPartAt(new Date(c.timestamp));
    byPart.set(p, [...(byPart.get(p) ?? []), c.cueLevelReached]);
  }
  const averages = [...byPart.entries()]
    .filter(([, cues]) => cues.length >= 3)
    .map(([p, cues]) => ({ p, avg: cues.reduce((s, x) => s + x, 0) / cues.length }));
  if (averages.length < 2) return null;
  const easiest = averages.reduce((best, x) => (x.avg < best.avg ? x : best));
  const others = averages.filter((x) => x.p !== easiest.p);
  if (easiest.p !== part || others.every((x) => x.avg - easiest.avg < 0.5)) return null;
  const name = part === "morning" ? "Mornings" : part === "afternoon" ? "Afternoons" : "Evenings";
  return `${name} have needed the least help lately.`;
}

function windowReason(part: DayPart, activity: ActivityDef): string {
  if (part === "morning") return `Morning is the best window for ${DOMAIN_WORDS[activity.domain]} activities.`;
  if (part === "afternoon") return `Afternoons suit ${DOMAIN_WORDS[activity.domain]} activities well.`;
  return "Evenings suit something calm and familiar, like this.";
}
