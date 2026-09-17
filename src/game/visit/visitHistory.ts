/**
 * AFTER THE VISIT — what happened, captured once, the day after. The only thing this data
 * does beyond record-keeping is place a dated marker on the trajectory chart when a
 * medicine changed. The marker is a timeline mark for a human to read, never a claim: this
 * file and everything downstream of it must never say or imply that the medicine caused
 * anything that happened around that date.
 */
export type VisitChange = "medication-started" | "medication-stopped" | "dose-changed" | "referred-onward" | "tests-ordered" | "no-change";

export const VISIT_CHANGE_LABEL: Record<VisitChange, string> = {
  "medication-started": "Medication started",
  "medication-stopped": "Medication stopped",
  "dose-changed": "Dose changed",
  "referred-onward": "Referred onward",
  "tests-ordered": "Tests ordered",
  "no-change": "No change",
};

export interface VisitRecord {
  id: string;
  appointmentId: string;
  /** The date of the appointment this record follows — the marker date, not today's date. */
  visitDate: number;
  whatWasSaid: string;
  changes: VisitChange[];
  nextAppointmentDate: number | null;
  recordedAt: number;
}

export const VISIT_HISTORY_KEY = "loom_visit_history_v1";

const MEDICATION_CHANGE_KINDS: VisitChange[] = ["medication-started", "medication-stopped", "dose-changed"];

export interface MedicationMarker {
  date: number;
  label: string;
}

/** One marker per visit where a medicine changed — dated, unlabelled beyond "medicine changed", nothing more. */
export function medicationMarkers(records: VisitRecord[]): MedicationMarker[] {
  return records
    .filter((r) => r.changes.some((c) => MEDICATION_CHANGE_KINDS.includes(c)))
    .map((r) => ({ date: r.visitDate, label: "medicine changed" }))
    .sort((a, b) => a.date - b.date);
}

/** The most recent past appointment that hasn't been followed up on yet. */
export function pendingFollowUp<T extends { id: string; date: number }>(appointments: T[], records: VisitRecord[], now: number): T | null {
  const done = new Set(records.map((r) => r.appointmentId));
  const past = appointments.filter((a) => a.date < now && !done.has(a.id)).sort((a, b) => b.date - a.date);
  return past[0] ?? null;
}
