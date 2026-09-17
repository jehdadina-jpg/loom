/**
 * SEVEN QUESTIONS — what the app cannot see, collected before the appointment while there's
 * time to think. Every question is skippable; only answered ones ever print or display.
 * "New behaviours" are listed neutrally, as things worth mentioning — never explained, never
 * interpreted. That is the doctor's job.
 */
export type SleepChange = "more" | "less" | "awake" | "same";
export type AppetiteChange = "less" | "more" | "losing-weight" | "same";
export type MoodChange = "withdrawn" | "anxious" | "irritable" | "usual";
export type NewBehaviour = "repeating-questions" | "wandering" | "suspicion" | "hallucinations" | "not-recognising" | "drowsiness" | "none";
export type FallsAnswer = "yes" | "no" | "not-sure";
export type MedicineIssue = "side-effects" | "missed-doses" | "hard-to-swallow" | "no-problems";

export interface PrepAnswers {
  sleep: SleepChange | null;
  sleepNote: string;
  appetite: AppetiteChange | null;
  mood: MoodChange | null;
  moodNote: string;
  behaviours: NewBehaviour[];
  falls: FallsAnswer | null;
  fallsNote: string;
  medicineIssue: MedicineIssue | null;
  /** The most important field in the app. Printed above everything the app measured. */
  worries: string;
  /** Up to three questions the family wants to ask, in the order they want to ask them. */
  questions: string[];
}

export const EMPTY_PREP: PrepAnswers = {
  sleep: null,
  sleepNote: "",
  appetite: null,
  mood: null,
  moodNote: "",
  behaviours: [],
  falls: null,
  fallsNote: "",
  medicineIssue: null,
  worries: "",
  questions: ["", "", ""],
};

export const SLEEP_LABEL: Record<SleepChange, string> = {
  more: "Sleeping more than usual",
  less: "Sleeping less than usual",
  awake: "Awake at night",
  same: "About the same",
};
export const APPETITE_LABEL: Record<AppetiteChange, string> = {
  less: "Eating less",
  more: "Eating more",
  "losing-weight": "Losing weight",
  same: "About the same",
};
export const MOOD_LABEL: Record<MoodChange, string> = {
  withdrawn: "Low or withdrawn",
  anxious: "Anxious or fearful",
  irritable: "Irritable",
  usual: "Much as usual",
};
export const BEHAVIOUR_LABEL: Record<NewBehaviour, string> = {
  "repeating-questions": "Repeating questions",
  wandering: "Wandering or getting lost",
  suspicion: "Suspicion or accusations",
  hallucinations: "Seeing things that aren't there",
  "not-recognising": "Not recognising people",
  drowsiness: "Daytime drowsiness",
  none: "None of these",
};
export const FALLS_LABEL: Record<FallsAnswer, string> = {
  yes: "Yes",
  no: "No",
  "not-sure": "Not sure",
};
export const MEDICINE_ISSUE_LABEL: Record<MedicineIssue, string> = {
  "side-effects": "New side effects",
  "missed-doses": "Doses being missed",
  "hard-to-swallow": "Hard to swallow",
  "no-problems": "No problems",
};

const SLEEP_SENTENCE: Record<SleepChange, string> = {
  more: "Sleeping more than usual.",
  less: "Sleeping less than usual.",
  awake: "Waking or restless at night.",
  same: "Sleep has stayed about the same.",
};
const APPETITE_SENTENCE: Record<AppetiteChange, string> = {
  less: "Eating less than usual.",
  more: "Eating more than usual.",
  "losing-weight": "Losing weight.",
  same: "Appetite has stayed about the same.",
};
const MOOD_SENTENCE: Record<MoodChange, string> = {
  withdrawn: "Seeming low or withdrawn.",
  anxious: "Seeming anxious or fearful.",
  irritable: "Seeming irritable.",
  usual: "Mood has been much as usual.",
};
const FALLS_SENTENCE: Record<FallsAnswer, string> = {
  yes: "Yes — a fall or near-fall.",
  no: "No falls or near-falls.",
  "not-sure": "Not sure.",
};
const MEDICINE_SENTENCE: Record<MedicineIssue, string> = {
  "side-effects": "New side effects noticed.",
  "missed-doses": "Doses have been missed.",
  "hard-to-swallow": "Hard to swallow.",
  "no-problems": "No problems with medicines.",
};

export interface NoticedLine {
  label: string;
  text: string;
}

/** Only what was actually answered — never a placeholder for a skipped question. */
export function noticedLines(p: PrepAnswers): NoticedLine[] {
  const out: NoticedLine[] = [];
  if (p.sleep) out.push({ label: "Sleep", text: `${SLEEP_SENTENCE[p.sleep]}${p.sleepNote.trim() ? ` ${p.sleepNote.trim()}` : ""}` });
  if (p.appetite) out.push({ label: "Appetite", text: APPETITE_SENTENCE[p.appetite] });
  if (p.mood) out.push({ label: "Mood", text: `${MOOD_SENTENCE[p.mood]}${p.moodNote.trim() ? ` ${p.moodNote.trim()}` : ""}` });
  if (p.behaviours.length) {
    const real = p.behaviours.filter((b) => b !== "none");
    out.push({ label: "New behaviours", text: real.length ? real.map((b) => BEHAVIOUR_LABEL[b]).join(", ") + "." : "None of these." });
  }
  if (p.falls) out.push({ label: "Falls", text: `${FALLS_SENTENCE[p.falls]}${p.fallsNote.trim() ? ` ${p.fallsNote.trim()}` : ""}` });
  if (p.medicineIssue) out.push({ label: "Medicines", text: MEDICINE_SENTENCE[p.medicineIssue] });
  return out;
}

/** The three questions the family wants to ask, non-empty only, in order. */
export function askQuestions(p: PrepAnswers): string[] {
  return p.questions.map((q) => q.trim()).filter(Boolean);
}

export function prepKey(appointmentId: string): string {
  return `loom_visit_prep_v1__${appointmentId}`;
}
