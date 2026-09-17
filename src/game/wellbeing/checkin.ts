/**
 * "How are you?" — a short, optional weekly check-in for the caregiver.
 *
 * The questions are written for LOOM in the spirit of caregiver-burden interviews; they are
 * not a licensed instrument and produce no clinical score. The result is only ever compared
 * with the caregiver's own earlier weeks.
 */
export interface CheckinQuestion {
  id: string;
  text: string;
  /** True when answering "nearly always" means things are *easier*. */
  reversed: boolean;
}

export const QUESTIONS: CheckinQuestion[] = [
  { id: "own-time", text: "Do you feel you have enough time for yourself?", reversed: true },
  { id: "stretched", text: "Do you feel stressed between caring and your other responsibilities?", reversed: false },
  { id: "sleep", text: "Have you been sleeping well enough this week?", reversed: true },
  { id: "health", text: "Do you feel caring is taking a toll on your own health?", reversed: false },
  { id: "handover", text: "Is there someone you can hand things over to when you need a break?", reversed: true },
];

export const SCALE = ["Never", "Rarely", "Sometimes", "Often", "Nearly always"];

export interface Checkin {
  id: string;
  /** Monday of the week it belongs to. */
  week: number;
  at: number;
  answers: Record<string, number>;
}

export interface WellbeingState {
  checkins: Checkin[];
  skippedWeeks: number[];
  /** Check-ins whose "things look heavier" note has already been shown. */
  noticesSeen: string[];
}

export const WELLBEING_KEY = "loom_wellbeing_v1";

export function mondayOf(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime();
}

/** 0 = not stretched at all, 4 = very stretched. Unanswered questions are left out. */
export function stretch(c: Checkin): number | null {
  const vals = QUESTIONS.flatMap((q) => {
    const a = c.answers[q.id];
    return a === undefined ? [] : [q.reversed ? 4 - a : a];
  });
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

/** Heavier than this caregiver's own recent weeks — never compared with anyone else. */
export function isRise(checkins: Checkin[], index: number): boolean {
  const cur = stretch(checkins[index]);
  const prev = checkins
    .slice(Math.max(0, index - 4), index)
    .map(stretch)
    .filter((x): x is number => x !== null);
  if (cur === null || prev.length < 2) return false;
  return cur - prev.reduce((s, x) => s + x, 0) / prev.length >= 0.6;
}

/** Say it once: only on the week things first got heavier, and only if not already seen. */
export function shouldShowNotice(state: WellbeingState): Checkin | null {
  const list = [...state.checkins].sort((a, b) => a.week - b.week);
  const last = list.length - 1;
  if (last < 0 || !isRise(list, last)) return null;
  if (last > 0 && isRise(list, last - 1)) return null;
  return state.noticesSeen.includes(list[last].id) ? null : list[last];
}
