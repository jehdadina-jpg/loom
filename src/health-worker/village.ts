import { computeTrajectory, type Trajectory, type Triage } from "../game/trajectory/trajectory";
import type { HealthWorkerRecord } from "./boundary";

export interface TriageRow {
  record: HealthWorkerRecord;
  trajectory: Trajectory;
  triage: Triage;
  reason: string;
}

const ORDER: Record<Triage, number> = { refer: 0, monitor: 1, continue: 2, wait: 3 };

/**
 * A whole village, sorted by trajectory: the steepest change against a person's own
 * baseline first. Anyone without a baseline yet is never ranked — they sit at the end in
 * name order, as "still getting to know them".
 */
export function triageVillage(records: HealthWorkerRecord[], now = Date.now()): TriageRow[] {
  return records
    .map((record): TriageRow => {
      const trajectory = computeTrajectory(record.events, now);
      return trajectory.state === "getting-to-know"
        ? { record, trajectory, triage: "wait", reason: `still getting to know them (${trajectory.daysSoFar} of ${trajectory.daysNeeded} days)` }
        : { record, trajectory, triage: trajectory.triage, reason: trajectory.reason };
    })
    .sort((a, b) => {
      if (ORDER[a.triage] !== ORDER[b.triage]) return ORDER[a.triage] - ORDER[b.triage];
      if (a.triage === "wait") return a.record.person.fullName.localeCompare(b.record.person.fullName);
      const sa = a.trajectory.state === "ready" ? a.trajectory.slope : 0;
      const sb = b.trajectory.state === "ready" ? b.trajectory.slope : 0;
      return sa - sb;
    });
}

// ---------------------------------------------------------------- directions, not counts

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/**
 * How often sessions happen, against this person's own earlier weeks. Replaces a
 * "sessions logged" total, which is activity rather than insight.
 */
export function sessionDirection(events: HealthWorkerRecord["events"], now = Date.now()): string {
  const starts = events.filter((e) => e.kind === "session_start").map((e) => e.t);
  if (!starts.length || now - Math.min(...starts) < 4 * WEEK) return "Too early to say how often sessions usually happen.";
  const recent = starts.filter((t) => t >= now - 2 * WEEK).length / 2;
  const earlier = starts.filter((t) => t < now - 2 * WEEK && t >= now - 6 * WEEK);
  const weeksEarlier = Math.max(1, Math.min(4, (now - 2 * WEEK - Math.min(...starts)) / WEEK));
  const usual = earlier.length / weeksEarlier;
  if (usual === 0) return "Sessions have only started recently.";
  if (recent < usual * 0.6) return "Sessions have been less frequent than in earlier weeks.";
  if (recent > usual * 1.4) return "Sessions have been more frequent than in earlier weeks.";
  return "Sessions are happening about as often as in earlier weeks.";
}

/**
 * Finding familiar places in the village, against this person's own first weeks. Replaces
 * the old bare wayfinding number, which was an error count with a polite name.
 */
export function wayfindingDirection(events: HealthWorkerRecord["events"], now = Date.now()): string {
  const trips = events.filter((e): e is Extract<typeof e, { kind: "wayfinding" }> => e.kind === "wayfinding");
  if (!trips.length) return "No trips around the village recorded yet.";
  const first = Math.min(...trips.map((t) => t.t));
  const early = trips.filter((t) => t.t < first + 2 * WEEK);
  const recent = trips.filter((t) => t.t >= now - 2 * WEEK && t.t >= first + 2 * WEEK);
  if (early.length < 5 || recent.length < 5) return "Not enough trips around the village yet to compare.";
  const avg = (xs: typeof trips) => xs.reduce((s, t) => s + t.extraTaps, 0) / xs.length;
  const change = avg(recent) - avg(early);
  if (change > 0.5) return "Finding familiar places has been taking more tries than in the first weeks.";
  if (change < -0.5) return "Finding familiar places has been coming more easily than in the first weeks.";
  return "Finding familiar places is about as easy as in the first weeks.";
}
