/**
 * The words on the Today screen. The caregiver should know whether today was fine from
 * the first sentence — so it is specific, compares only with this person's own recent
 * sessions, and never carries a digit, a percentage or an error count.
 */
import { getActivity } from "../../data/activities";
import type { SessionRecord } from "../session/history";
import type { Words } from "../trajectory/trajectory";

const DAY = 86_400_000;
const NUMBER_WORDS = ["none", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const say = (n: number) => NUMBER_WORDS[n] ?? "several";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "Good morning.";
  if (h >= 12 && h < 17) return "Good afternoon.";
  if (h >= 17) return "Good evening.";
  return "Hello.";
}

function partOfDay(t: number): string {
  const h = new Date(t).getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

const startOfDay = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

const onOwn = (r: SessionRecord) => (r.parts ? r.partsWithoutHelp / r.parts : 0);

/** What was done, in the activity's own terms: recognised faces, put steps in order, counted. */
function verbFor(activityId: string): { verb: string; noun: string } {
  const a = getActivity(activityId);
  if (!a) return { verb: "did", noun: "" };
  if (a.kind === "sequence") return { verb: "put", noun: " steps in order" };
  if (a.kind === "count") return { verb: "counted", noun: "" };
  if (a.kind === "pairs") return { verb: "matched", noun: " pairs" };
  return a.domain === "memory" ? { verb: "recognised", noun: "" } : { verb: "picked out", noun: "" };
}

/**
 * The opening sentence. Examples:
 *   "Kamala had a steady session this morning — she recognised four of five on her own."
 *   "Kamala had a harder morning than usual — she put two of five steps in order on her own."
 *   "No session yet today."
 */
export function openingSentence(records: SessionRecord[], w: Words, now: number): string {
  const today = startOfDay(now);
  const todays = records.filter((r) => r.startedAt >= today);
  if (todays.length === 0) return "No session yet today.";

  const last = todays[todays.length - 1];
  const who = cap(w.name);
  const part = partOfDay(last.startedAt);

  if (!last.completed) {
    return `${who} started a session this ${part}, and it was set aside for another time.`;
  }

  // their own recent sessions — never anyone else's
  const recent = records.filter((r) => r.completed && r.parts > 0 && r.startedAt < today && r.startedAt >= today - 14 * DAY);
  const usual = recent.length >= 3 ? recent.reduce((s, r) => s + onOwn(r), 0) / recent.length : null;
  const ratio = onOwn(last);

  let character: string;
  if (usual !== null && ratio < usual - 0.25) character = `a harder ${part} than usual`;
  else if (usual !== null && ratio > usual + 0.2) character = `a good session this ${part}`;
  else if (usual === null && ratio < 0.5) character = `a session with plenty of help this ${part}`;
  else character = `a steady session this ${part}`;

  if (last.parts <= 1) {
    return `${who} had ${character} — ${last.partsWithoutHelp === 1 ? "done without any help" : "done with a little help"}.`;
  }
  const { verb, noun } = verbFor(last.activityId);
  const amount = last.partsWithoutHelp === last.parts ? `all ${say(last.parts)}${noun}` : `${say(last.partsWithoutHelp)} of ${say(last.parts)}${noun}`;
  // pronouns only when the family chose them; otherwise the sentence is built around the name
  return w.subject !== w.name
    ? `${who} had ${character} — ${w.subject} ${verb} ${amount} on ${w.possessive} own.`
    : `${who} had ${character}, and ${verb} ${amount} without help.`;
}

export type WeekWord = "steady" | "harder than usual" | "easier than usual" | "up and down" | "still getting to know";

/** One word for the week, against their own starting point. */
export function weekWord(
  trajectory: { state: "getting-to-know" } | { state: "ready"; domains: { shift: number; pattern: string }[] },
): WeekWord {
  if (trajectory.state === "getting-to-know") return "still getting to know";
  const shift = trajectory.domains.reduce((s, d) => s + d.shift, 0) / Math.max(1, trajectory.domains.length);
  if (trajectory.domains.some((d) => d.pattern === "high-variance")) return "up and down";
  if (shift < -0.06) return "harder than usual";
  if (shift > 0.06) return "easier than usual";
  return "steady";
}
