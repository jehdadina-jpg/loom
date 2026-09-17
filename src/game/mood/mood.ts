/**
 * THE CAREGIVER'S OWN READ — a one-tap "how did that feel?" after each session, kept
 * purely on the family's device (never synced to the health-worker record, the same
 * treatment as the caregiver's own written notes). The caregiver sees the person all day;
 * the app sees ten minutes. When the two disagree, that disagreement is itself a finding —
 * treated as data here, never corrected toward what the app measured.
 */
import type { SessionRecord } from "../session/history";
import type { Trajectory } from "../trajectory/trajectory";

export type MoodRead = "easier" | "same" | "harder";

export interface MoodEntry {
  sessionId: string;
  at: number;
  read: MoodRead;
}

export interface MoodState {
  entries: MoodEntry[];
  /** Sessions where the prompt was shown and dismissed unanswered — never asked again. */
  skippedSessionIds: string[];
}

export const MOOD_KEY = "loom_mood_v1";
export const EMPTY_MOOD: MoodState = { entries: [], skippedSessionIds: [] };

const DAY = 86_400_000;
const RECENT_WINDOW = 21 * DAY;
const MIN_RECENT_ENTRIES = 3;

/** The most recent finished session that hasn't been asked about yet, if any. */
export function sessionToAskAbout(records: SessionRecord[], state: MoodState, now: number): SessionRecord | null {
  const asked = new Set([...state.entries.map((e) => e.sessionId), ...state.skippedSessionIds]);
  const candidates = records.filter((r) => r.completed && r.endedAt <= now && !asked.has(r.sessionId));
  return candidates.length ? candidates[candidates.length - 1] : null;
}

function recentEntries(state: MoodState, now: number): MoodEntry[] {
  return state.entries.filter((e) => now - e.at <= RECENT_WINDOW);
}

/** A read of the mood entries alone, for the overlay chart's own line — a rough 0–1 scale, easier is higher. */
export function moodValue(read: MoodRead): number {
  return read === "easier" ? 0.85 : read === "same" ? 0.5 : 0.15;
}

export type MoodCase = "agreeing-steady" | "agreeing-declining" | "diverging";

export interface MoodComparison {
  case: MoodCase;
  sentence: string;
  recentReads: MoodEntry[];
}

function measuredDeclining(trajectory: Trajectory): boolean {
  return trajectory.state === "ready" && trajectory.moved.some((d) => d.pattern !== "high-variance");
}

/**
 * Compares the caregiver's own recent reads with what's measured. Null when there isn't
 * enough of either yet to say anything honest — never guessed at.
 */
export function moodVsMeasured(state: MoodState, trajectory: Trajectory, now = Date.now()): MoodComparison | null {
  if (trajectory.state !== "ready") return null;
  const recent = recentEntries(state, now);
  if (recent.length < MIN_RECENT_ENTRIES) return null;

  const harder = recent.filter((e) => e.read === "harder").length;
  const caregiverDeclining = harder / recent.length > 0.5;
  const appDeclining = measuredDeclining(trajectory);

  if (!caregiverDeclining && !appDeclining) {
    return { case: "agreeing-steady", sentence: "What you're seeing matches what we're measuring.", recentReads: recent };
  }
  if (caregiverDeclining && appDeclining) {
    return {
      case: "agreeing-declining",
      sentence: "What you've noticed matches what's being measured — that adds real weight to the suggestion to see a doctor.",
      recentReads: recent,
    };
  }
  if (caregiverDeclining && !appDeclining) {
    return {
      case: "diverging",
      sentence: `You've felt the last three weeks were harder, though the activities haven't changed much. That's worth mentioning to a doctor — mood, sleep, pain or a medication change can all show up this way before anything else does.`,
      recentReads: recent,
    };
  }
  return {
    case: "diverging",
    sentence: `The activities have needed a little more help these last few weeks, though it hasn't felt that way day to day for you. That gap is worth mentioning to a doctor too — it can go either way round.`,
    recentReads: recent,
  };
}
