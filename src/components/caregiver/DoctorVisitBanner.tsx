/**
 * TODAY'S ENTRY POINT into the doctor-visit flow — an appointment within a week asks
 * plainly whether it's time to prepare; a past appointment without a follow-up asks once
 * how it went; otherwise a quiet, low-pressure door into the same place.
 */
import { usePersistentState } from "../../game/state/usePersistentState";
import { APPOINTMENTS_KEY, appointmentWithin, type Appointment } from "../../game/visit/appointment";
import { pendingFollowUp, VISIT_HISTORY_KEY, type VisitRecord } from "../../game/visit/visitHistory";

export function DoctorVisitBanner({ onOpen }: { onOpen: () => void }) {
  const [appointments] = usePersistentState<Appointment[]>(APPOINTMENTS_KEY, []);
  const [visitRecords] = usePersistentState<VisitRecord[]>(VISIT_HISTORY_KEY, []);
  const now = Date.now();
  const followUp = pendingFollowUp(appointments, visitRecords, now);
  const soon = appointmentWithin(appointments, 7, now);

  let text: string;
  if (followUp) {
    text = `How did the visit with ${followUp.doctorName} go?`;
  } else if (soon) {
    const when = new Date(soon.date).toLocaleDateString(undefined, { weekday: "long" });
    text = `${soon.doctorName}, ${when}. Ready to prepare?`;
  } else {
    text = "Preparing for a doctor's visit?";
  }

  return (
    <button
      onClick={onOpen}
      className="w-full rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-4 text-left text-lg text-[var(--ink)] hover:bg-[var(--parchment2)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] sm:p-5"
    >
      {text}
    </button>
  );
}
