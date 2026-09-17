/**
 * Everything that needs a human, worked out from the record. Pure functions — the
 * AlertsProvider keeps the ledger so an alert, once raised, is never lost or deleted.
 *
 * Framing rules: plain sentences, one alert per thing (never a tally), and nothing that
 * reads as a score. Session patterns describe the pattern ("fewer sessions this week than
 * usual"), never the person.
 */
import { DOMAIN_NAMES } from "../../data/domains";
import type { HealthWorkerEvent } from "../../health-worker/boundary";
import {
  DUE_WINDOW_MS,
  occurrencesOn,
  occurrenceState,
  type Reminder,
  type ReminderLogEntry,
} from "../reminders/model";
import { formatDay, trajectorySentence, type Trajectory, type Words } from "../trajectory/trajectory";

export type AlertKind = "referral" | "reminder" | "session" | "app-changed";

export interface AlertDraft {
  id: string;
  kind: AlertKind;
  /** When the thing happened, used as the raise time if it's new. */
  at: number;
  sentence: string;
  domains?: string[];
  /** For app-changed alerts: what to restore if the caregiver prefers the earlier setting. */
  change?: { domain: string; from: { level: string; idleCueMs: number }; to: { level: string; idleCueMs: number } };
}

const DAY = 86_400_000;

const startOfDay = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

function mondayOf(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime();
}

export function referralDraft(t: Trajectory, w: Words, now: number): AlertDraft | null {
  if (t.state !== "ready" || t.triage !== "refer") return null;
  const moved = t.moved.filter((d) => d.pattern === "sharp-change" || d.pattern === "sustained-shift");
  const since = Math.min(...moved.map((d) => d.since ?? now));
  return {
    id: `referral|${startOfDay(since)}|${moved.map((d) => d.domain).sort().join("+")}`,
    kind: "referral",
    at: now,
    sentence: trajectorySentence(t, w),
    domains: moved.map((d) => DOMAIN_NAMES[d.domain]),
  };
}

function partOfDay(t: number): string {
  const h = new Date(t).getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

/**
 * Yesterday's unmarked reminder times, one alert each, said once. Older days are not
 * gathered up into a list — a week of missed doses shown as a column is a tally.
 */
export function reminderDrafts(reminders: Reminder[], log: ReminderLogEntry[], now: number): AlertDraft[] {
  const day = new Date(startOfDay(now) - DAY);
  const drafts: AlertDraft[] = [];
  for (const r of reminders) {
    if (!r.escalate) continue;
    for (const o of occurrencesOn(r, day)) {
      if (o.scheduledFor < r.createdAt || occurrenceState(o, log, now) !== "missed") continue;
      const label = r.label.charAt(0).toUpperCase() + r.label.slice(1);
      const part = partOfDay(o.scheduledFor);
      // "Evening medicine wasn't marked done yesterday", not "Evening medicine (evening)"
      const when = r.label.toLowerCase().includes(part) ? "" : ` (${part})`;
      drafts.push({
        id: `reminder|${o.key}`,
        kind: "reminder",
        at: o.scheduledFor + DUE_WINDOW_MS,
        sentence: `${label}${when} wasn't marked done yesterday.`,
      });
    }
  }
  return drafts;
}

interface SessionSpan {
  start: number;
  end: number | null;
  activities: number;
}

export function sessionSpans(events: HealthWorkerEvent[]): SessionSpan[] {
  const starts = events.filter((e): e is Extract<HealthWorkerEvent, { kind: "session_start" }> => e.kind === "session_start");
  return starts.map((s, i) => {
    const next = starts[i + 1]?.t ?? Infinity;
    const end = events.find((e) => e.kind === "session_end" && e.sessionId === s.sessionId)?.t ?? null;
    const until = end ?? next;
    return {
      start: s.t,
      end,
      activities: events.filter((e) => e.kind === "activity" && e.t >= s.t && e.t <= until).length,
    };
  });
}

export function sessionDrafts(events: HealthWorkerEvent[], now: number): AlertDraft[] {
  const spans = sessionSpans(events);
  if (spans.length < 5) return [];
  const drafts: AlertDraft[] = [];
  const weekStart = now - 7 * DAY;
  const monday = mondayOf(now);

  const thisWeek = spans.filter((s) => s.start >= weekStart);
  const stopped = thisWeek.filter((s) => s.activities === 0 && (s.end !== null || now - s.start > 3600_000));
  if (stopped.length >= 2) {
    drafts.push({
      id: `session|stopped|${monday}`,
      kind: "session",
      at: stopped[stopped.length - 1].start,
      sentence: "Some sessions this week were stopped partway through.",
    });
  }

  // compare with this person's own previous four weeks
  const earlier = spans.filter((s) => s.start < weekStart && s.start >= weekStart - 28 * DAY);
  const earliestKnown = spans[0].start;
  const fullHistory = earliestKnown <= weekStart - 21 * DAY;
  if (fullHistory && earlier.length) {
    const usualPerWeek = earlier.length / 4;
    const minutes = (list: SessionSpan[]) => list.reduce((s, x) => s + Math.max(0, ((x.end ?? x.start) - x.start) / 60_000), 0);
    if (usualPerWeek >= 3 && thisWeek.length < usualPerWeek * 0.5) {
      drafts.push({ id: `session|fewer|${monday}`, kind: "session", at: now, sentence: "Fewer sessions this week than usual." });
    } else if (minutes(earlier) / 4 >= 20 && minutes(thisWeek) < (minutes(earlier) / 4) * 0.5) {
      drafts.push({ id: `session|time|${monday}`, kind: "session", at: now, sentence: "Less time spent in sessions this week than usual." });
    }

    const last = spans[spans.length - 1].start;
    const gapDays = Math.floor((startOfDay(now) - startOfDay(last)) / DAY);
    const usualDays = new Set(earlier.map((s) => startOfDay(s.start))).size;
    if (gapDays >= 3 && usualDays >= 17) {
      drafts.push({
        id: `session|gap|${startOfDay(last)}`,
        kind: "session",
        at: now,
        sentence: `No sessions since ${formatDay(last)}. Usually there is one most days.`,
      });
    }
  }
  return drafts;
}

// ---------------------------------------------------------------- the app has changed

export interface AdaptiveSnapshot {
  level: string;
  idleCueMs: number;
}

const DOMAIN_WORD = (d: string) => (DOMAIN_NAMES as Record<string, string>)[d] ?? d;

export function appChangedDrafts(
  before: Record<string, AdaptiveSnapshot>,
  after: Record<string, AdaptiveSnapshot & { levelReason: string; timeReason: string; fromHistory: boolean }>,
  w: Words,
  now: number,
): AlertDraft[] {
  const drafts: AlertDraft[] = [];
  for (const [domain, next] of Object.entries(after)) {
    const prev = before[domain];
    if (!prev) continue;
    const name = DOMAIN_WORD(domain);

    // only the app adapting to the person's own play is news; set-up (a RUDAS saved or
    // removed, a first session) is not the app changing its mind
    if (prev.level !== next.level && next.fromHistory) {
      const what =
        next.level === "gentle"
          ? "now show fewer choices"
          : next.level === "fuller"
            ? "now show a few more choices"
            : "are back to the usual number of choices";
      drafts.push({
        id: `app-changed|${domain}|level|${prev.level}>${next.level}|${startOfDay(now)}`,
        kind: "app-changed",
        at: now,
        sentence: `${name} activities ${what}, because ${next.levelReason}.`,
        // each alert carries only its own change, so "keep the earlier setting" undoes just that
        change: { domain, from: { level: prev.level, idleCueMs: next.idleCueMs }, to: { level: next.level, idleCueMs: next.idleCueMs } },
      });
    }
    if (prev.idleCueMs !== next.idleCueMs) {
      const sentence =
        next.idleCueMs > prev.idleCueMs
          ? `${name} activities are giving ${w.object} more time before offering a hint, because ${next.timeReason}.`
          : `${name} activities are offering hints a little sooner again, because ${next.timeReason}.`;
      drafts.push({ id: `app-changed|${domain}|time|${prev.idleCueMs}>${next.idleCueMs}|${startOfDay(now)}`, kind: "app-changed", at: now, sentence, change: { domain, from: { level: next.level, idleCueMs: prev.idleCueMs }, to: { level: next.level, idleCueMs: next.idleCueMs } } });
    }
  }
  return drafts;
}
