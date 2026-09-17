import { getActivity } from "../../data/activities";
import type { TelemetryEvent } from "../telemetry/store";
import { dayPartAt } from "./schedule";

type SessionStart = Extract<TelemetryEvent, { type: "session_start" }>;

export interface SessionRecord {
  sessionId: string;
  activityId: string;
  startedAt: number;
  endedAt: number;
  completed: boolean;
  /** Steps, pairs or answers reached — one for a single-choice activity. */
  parts: number;
  /** Of those, how many were reached before any cue was showing. */
  partsWithoutHelp: number;
}

/** Caregiver-started sessions, oldest first, rebuilt from the event log. */
export function sessionRecords(events: TelemetryEvent[]): SessionRecord[] {
  const starts = events.filter((e): e is SessionStart => e.type === "session_start");

  return starts.map((start, i) => {
    const nextStart = starts[i + 1]?.timestamp ?? Infinity;
    const within = events.filter((e) => e.timestamp >= start.timestamp && e.timestamp < nextStart);
    const end = within.find((e) => e.type === "session_end" && e.sessionId === start.sessionId);
    const cutoff = end?.timestamp ?? Infinity;
    const own = within.filter(
      (e) => e.timestamp <= cutoff && "activityId" in e && e.activityId === start.activityId && e.type !== "session_start",
    );
    const reached = own.filter(
      (e): e is Extract<TelemetryEvent, { type: "activity_attempt" }> => e.type === "activity_attempt" && e.correct,
    );

    return {
      sessionId: start.sessionId,
      activityId: start.activityId,
      startedAt: start.timestamp,
      // if the app was closed mid-session, the last thing that happened stands in for the end
      endedAt: end?.timestamp ?? Math.max(start.timestamp, ...own.map((e) => e.timestamp)),
      completed: own.some((e) => e.type === "activity_complete"),
      parts: reached.length,
      partsWithoutHelp: reached.filter((e) => e.cueLevel === 0).length,
    };
  });
}

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const say = (n: number) => NUMBER_WORDS[n] ?? String(n);
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * One plain sentence about how a session went — describes the help given, never grades it.
 * Written without pronouns, since the profile doesn't record them.
 */
export function sessionSentence(r: SessionRecord): string {
  const started = new Date(r.startedAt);
  const late = started.getHours() >= 22 || started.getHours() < 5;
  const part = late ? "night" : dayPartAt(started);
  if (!r.completed) return `A short ${part}. The activity was set aside for another time.`;
  if (r.parts <= 1) {
    return r.partsWithoutHelp === 1 ? `A steady ${part}. Done without any help.` : `A gentle ${part}. Done with a little help.`;
  }
  if (r.partsWithoutHelp === r.parts) return `A steady ${part}. All ${say(r.parts)} done without help.`;
  if (r.partsWithoutHelp === 0) return `A ${part} with help alongside. Every step was done together.`;
  if (r.partsWithoutHelp / r.parts >= 0.6) {
    return `A steady ${part}. ${capitalise(say(r.partsWithoutHelp))} of ${say(r.parts)} done without help.`;
  }
  return `A ${part} with some support. ${capitalise(say(r.partsWithoutHelp))} of ${say(r.parts)} done without help.`;
}

export function sessionActivityTitle(r: SessionRecord): string {
  return getActivity(r.activityId)?.title ?? "An activity";
}

export function formatWhen(ts: number, now = new Date()): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (dayDiff === 0) return `Today at ${time}`;
  if (dayDiff === 1) return `Yesterday at ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} at ${time}`;
}

export function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "Under a minute";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr ${mins % 60} min`;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * True only when there's been no session today and it's now well past the time sessions
 * usually start. With too little history there is no "usual", so this stays quiet.
 */
export function quietDaySoFar(records: SessionRecord[], now = new Date()): boolean {
  const today = startOfDay(now);
  if (records.some((r) => r.startedAt >= today)) return false;

  const firstPerDay = new Map<number, number>();
  for (const r of records) {
    const day = startOfDay(new Date(r.startedAt));
    if (!firstPerDay.has(day)) firstPerDay.set(day, r.startedAt - day);
  }
  if (firstPerDay.size < 3) return false;

  const offsets = [...firstPerDay.values()].sort((a, b) => a - b);
  const usual = offsets[Math.floor(offsets.length / 2)];
  return now.getTime() - today > usual + 60 * 60_000;
}
