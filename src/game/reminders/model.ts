/**
 * Reminders for the four categories named in PS 26003. Labels are the family's own
 * words ("the white tablet"), never a drug or condition database.
 */

export type ReminderCategory = "medicine" | "hydration" | "activity" | "appointment";

export const CATEGORIES: { id: ReminderCategory; label: string; singular: string }[] = [
  { id: "medicine", label: "Medicines", singular: "medicine" },
  { id: "hydration", label: "Hydration", singular: "hydration" },
  { id: "activity", label: "Daily activities", singular: "daily activity" },
  { id: "appointment", label: "Medical appointments", singular: "appointment" },
];

export type ReminderSchedule =
  /** Every day, at each of these times ("HH:MM", 24h). */
  | { kind: "daily"; times: string[] }
  /** On these weekdays (0 = Sunday) at one time. */
  | { kind: "weekly"; days: number[]; time: string }
  /** A single occurrence at an exact date and time — an appointment, not a recurring habit. */
  | { kind: "once"; date: number };

export interface Reminder {
  id: string;
  category: ReminderCategory;
  label: string;
  schedule: ReminderSchedule;
  /** Downscaled JPEG data URL — a picture of the actual pill strip, bottle, clinic card. */
  photo: string | null;
  /** Notify the caregiver's device if nothing happens within ESCALATE_AFTER_MS. */
  escalate: boolean;
  createdAt: number;
}

export type ReminderLogEntry =
  /** The time came round while the app was open. */
  | { type: "fired"; key: string; reminderId: string; category: ReminderCategory; scheduledFor: number; timestamp: number }
  /** The card actually appeared on the patient side. */
  | { type: "shown"; key: string; reminderId: string; timestamp: number }
  | { type: "faded"; key: string; reminderId: string; timestamp: number }
  | { type: "escalated"; key: string; reminderId: string; timestamp: number }
  | {
      type: "done";
      key: string;
      reminderId: string;
      category: ReminderCategory;
      by: "patient" | "caregiver";
      /** Card shown → "Done". Patient responses only; caregiver marks are not a response. */
      latencyMs: number | null;
      timestamp: number;
    };

export const ESCALATE_AFTER_MS = 30 * 60_000;
/** The patient card fades on its own after this long. */
export const CARD_FADE_MS = 4 * 60_000;
/** Past this, a reminder no longer appears on the patient side — it's the caregiver's call. */
export const PATIENT_CARD_WINDOW_MS = 60 * 60_000;
/** After this long with no "Done", today's state reads "missed". */
export const DUE_WINDOW_MS = 2 * 60 * 60_000;

export function defaultEscalation(category: ReminderCategory): boolean {
  return category === "medicine" || category === "appointment";
}

export interface Occurrence {
  key: string;
  reminder: Reminder;
  scheduledFor: number;
}

function dayStamp(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function at(day: Date, hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime();
}

export function occurrencesOn(reminder: Reminder, day: Date): Occurrence[] {
  const s = reminder.schedule;
  if (s.kind === "once") {
    const d = new Date(s.date);
    if (d.getFullYear() !== day.getFullYear() || d.getMonth() !== day.getMonth() || d.getDate() !== day.getDate()) return [];
    return [{ key: `${reminder.id}|${dayStamp(day)}|once`, reminder, scheduledFor: s.date }];
  }
  const times = s.kind === "daily" ? s.times : s.days.includes(day.getDay()) ? [s.time] : [];
  return [...new Set(times)]
    .sort()
    .map((t) => ({ key: `${reminder.id}|${dayStamp(day)}|${t}`, reminder, scheduledFor: at(day, t) }));
}

export function nextOccurrence(reminder: Reminder, now: Date): Occurrence | null {
  for (let i = 0; i < 8; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const next = occurrencesOn(reminder, day).find((o) => o.scheduledFor > now.getTime());
    if (next) return next;
  }
  return null;
}

export type OccurrenceState = "done" | "due" | "missed" | "upcoming";

export function occurrenceState(o: Occurrence, log: ReminderLogEntry[], now: number): OccurrenceState {
  if (log.some((e) => e.type === "done" && e.key === o.key)) return "done";
  if (o.scheduledFor > now) return "upcoming";
  return now - o.scheduledFor < DUE_WINDOW_MS ? "due" : "missed";
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function describeSchedule(s: ReminderSchedule): string {
  if (s.kind === "once") {
    const d = new Date(s.date);
    return `${d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} at ${formatTime(s.date)}`;
  }
  const today = new Date();
  const times = (s.kind === "daily" ? [...s.times].sort() : [s.time]).map((t) => formatTime(at(today, t)));
  const timeText = times.length > 1 ? `${times.slice(0, -1).join(", ")} and ${times[times.length - 1]}` : times[0];
  if (s.kind === "daily") return `Every day at ${timeText}`;
  if (s.days.length === 7) return `Every day at ${timeText}`;
  const days = [...s.days].sort().map((d) => DAY_NAMES[d]);
  return `${days.join(", ")} at ${timeText}`;
}

export function describeNext(o: Occurrence | null, now: Date): string {
  if (!o) return "Nothing coming up";
  const d = new Date(o.scheduledFor);
  const dayDiff = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000,
  );
  const day =
    dayDiff === 0 ? "today" : dayDiff === 1 ? "tomorrow" : d.toLocaleDateString(undefined, { weekday: "long" });
  return `${day} at ${formatTime(o.scheduledFor)}`;
}
