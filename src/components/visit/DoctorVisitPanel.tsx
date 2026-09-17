/**
 * DOCTOR VISIT — the highest-value artefact the caregiver side produces: preparation,
 * report, and follow-up capture, all in one segment of the Progress tab. See
 * src/game/visit/appointment.ts, prep.ts, visitHistory.ts and report.ts for the data.
 */
import { useMemo, useState } from "react";
import { useTelemetry } from "../../game/telemetry/store";
import { useAlerts } from "../../game/alerts/AlertsContext";
import { useProfile } from "../../game/profiles/ProfileContext";
import { ageFrom, personWords } from "../../game/profiles/words";
import { usePersistentState } from "../../game/state/usePersistentState";
import { useReminders } from "../../game/reminders/ReminderContext";
import { describeSchedule } from "../../game/reminders/model";
import { readRecordEvents } from "../../health-worker/boundary";
import { computeRhythm } from "../../game/rhythm/rhythm";
import { computeSteadiness } from "../../game/trajectory/steadiness";
import { RUDAS_KEY, type RudasRecord } from "../../game/clinical/rudas";
import {
  APPOINTMENTS_KEY,
  appointmentLine,
  nextAppointment,
  type Appointment,
} from "../../game/visit/appointment";
import { EMPTY_PREP, prepKey, type PrepAnswers } from "../../game/visit/prep";
import {
  medicationMarkers,
  pendingFollowUp,
  VISIT_CHANGE_LABEL,
  VISIT_HISTORY_KEY,
  type VisitChange,
  type VisitRecord,
} from "../../game/visit/visitHistory";
import type { VisitReportData } from "../../game/visit/report";
import { PrepWizard } from "./PrepWizard";
import { VisitReportView } from "./VisitReportView";

export const CAREGIVER_IDENTITY_KEY = "loom_caregiver_identity_v1";

const field =
  "w-full rounded-[6px] border-2 border-[var(--parchment2)] bg-[#fffdf8] p-2 text-base text-[var(--ink)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]";
const primaryBtn =
  "rounded-[6px] bg-[var(--accent)] px-5 py-3 text-lg font-bold text-[var(--on-accent)] shadow-[0_3px_0_var(--accent-shadow)] hover:bg-[var(--accent-hover)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]";
const secondaryBtn =
  "rounded-[6px] border-2 border-[var(--ink-soft)] bg-[var(--parchment)] px-4 py-2 text-base font-semibold text-[var(--ink)] hover:bg-[var(--parchment2)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]";

function toLocalInput(t: number): { date: string; time: string } {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}
function fromLocalInput(date: string, time: string): number | null {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = (time || "09:00").split(":").map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
}

function AppointmentForm({ initial, onSave, onCancel, onRemove }: { initial: Appointment | null; onSave: (a: Appointment) => void; onCancel: () => void; onRemove?: () => void }) {
  const t0 = toLocalInput(initial?.date ?? Date.now() + 7 * 86_400_000);
  const [doctorName, setDoctorName] = useState(initial?.doctorName ?? "");
  const [speciality, setSpeciality] = useState(initial?.speciality ?? "");
  const [date, setDate] = useState(t0.date);
  const [time, setTime] = useState(t0.time);
  const [place, setPlace] = useState(initial?.place ?? "");

  function save() {
    const ts = fromLocalInput(date, time);
    if (!doctorName.trim() || !ts) return;
    onSave({
      id: initial?.id ?? `appt${Date.now().toString(36)}`,
      doctorName: doctorName.trim(),
      speciality: speciality.trim(),
      date: ts,
      place: place.trim(),
      createdAt: initial?.createdAt ?? Date.now(),
    });
  }

  return (
    <div className="space-y-4 rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-5">
      <div>
        <label className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Doctor's name</label>
        <input className={`${field} mt-1`} value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="e.g. Dr Baruah" />
      </div>
      <div>
        <label className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Speciality</label>
        <input
          className={`${field} mt-1`}
          value={speciality}
          onChange={(e) => setSpeciality(e.target.value)}
          placeholder="e.g. the memory doctor at the district hospital"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Date</label>
          <input type="date" className={`${field} mt-1`} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Time</label>
          <input type="time" className={`${field} mt-1`} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Place</label>
        <input className={`${field} mt-1`} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. District hospital, Room 4" />
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={save} className={primaryBtn}>
          Save appointment
        </button>
        <button onClick={onCancel} className={secondaryBtn}>
          Cancel
        </button>
        {onRemove && (
          <button onClick={onRemove} className="ml-auto rounded-[6px] px-4 py-2 text-base font-medium text-[var(--terracotta-ink)] underline underline-offset-2 hover:bg-black/5">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function AfterVisitForm({ appointment, onSave, onCancel }: { appointment: Appointment; onSave: (r: Omit<VisitRecord, "id" | "recordedAt">) => void; onCancel: () => void }) {
  const [whatWasSaid, setWhatWasSaid] = useState("");
  const [changes, setChanges] = useState<VisitChange[]>([]);
  const [nextDate, setNextDate] = useState("");

  function toggle(c: VisitChange) {
    setChanges((prev) => (c === "no-change" ? (prev.includes("no-change") ? [] : ["no-change"]) : prev.includes(c) ? prev.filter((x) => x !== c) : [...prev.filter((x) => x !== "no-change"), c]));
  }

  function save() {
    onSave({
      appointmentId: appointment.id,
      visitDate: appointment.date,
      whatWasSaid: whatWasSaid.trim(),
      changes,
      nextAppointmentDate: fromLocalInput(nextDate, "09:00"),
    });
  }

  const options: VisitChange[] = ["medication-started", "medication-stopped", "dose-changed", "referred-onward", "tests-ordered", "no-change"];

  return (
    <div className="space-y-4 rounded-[6px] border-2 border-[var(--accent)] bg-[var(--parchment)] p-5">
      <h2 className="text-xl font-semibold text-[var(--ink)]">How did the visit with {appointment.doctorName} go?</h2>
      <div>
        <label className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">What was said</label>
        <textarea className={`${field} mt-1`} rows={4} value={whatWasSaid} onChange={(e) => setWhatWasSaid(e.target.value)} placeholder="In your own words." />
      </div>
      <div>
        <label className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">What changed</label>
        <div className="mt-2 flex flex-col gap-2">
          {options.map((o) => (
            <button
              key={o}
              onClick={() => toggle(o)}
              className={`w-full rounded-[6px] border-2 px-4 py-2.5 text-left text-base font-medium focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] ${
                changes.includes(o) ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--parchment)]" : "border-[var(--parchment2)] bg-[#fffdf8] text-[var(--ink)] hover:bg-[var(--parchment2)]"
              }`}
            >
              {VISIT_CHANGE_LABEL[o]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Next appointment (optional)</label>
        <input type="date" className={`${field} mt-1`} value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={save} className={primaryBtn}>
          Save
        </button>
        <button onClick={onCancel} className={secondaryBtn}>
          Later
        </button>
      </div>
    </div>
  );
}

export function DoctorVisitPanel() {
  const { events } = useTelemetry();
  const { trajectory } = useAlerts();
  const { active, activeId } = useProfile();
  const w = personWords(active.person);
  const { reminders, saveReminder } = useReminders();

  const [appointments, setAppointments] = usePersistentState<Appointment[]>(APPOINTMENTS_KEY, []);
  const [visitRecords, setVisitRecords] = usePersistentState<VisitRecord[]>(VISIT_HISTORY_KEY, []);
  const [identity, setIdentity] = usePersistentState<{ name: string; relationship: string }>(CAREGIVER_IDENTITY_KEY, { name: "", relationship: "" });
  const [rudas] = usePersistentState<RudasRecord[]>(RUDAS_KEY, []);

  const now = Date.now();
  const upcoming = useMemo(() => nextAppointment(appointments, now), [appointments, now]);
  const followUp = useMemo(() => pendingFollowUp(appointments, visitRecords, now), [appointments, visitRecords, now]);

  const [prep, setPrep] = usePersistentState<PrepAnswers>(prepKey(upcoming?.id ?? "draft"), EMPTY_PREP);

  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showPrep, setShowPrep] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showAfterVisit, setShowAfterVisit] = useState(false);

  const hwEvents = useMemo(() => readRecordEvents(localStorage, activeId), [activeId, events]);
  const medicines = useMemo(() => reminders.filter((r) => r.category === "medicine").map((r) => `${r.label} — ${describeSchedule(r.schedule)}`), [reminders]);
  const markers = useMemo(() => medicationMarkers(visitRecords), [visitRecords]);

  function saveAppointment(a: Appointment) {
    setAppointments((prev) => (prev.some((x) => x.id === a.id) ? prev.map((x) => (x.id === a.id ? a : x)) : [...prev, a]));
    saveReminder({
      category: "appointment",
      label: `${a.doctorName}${a.speciality ? ` — ${a.speciality}` : ""}`,
      schedule: { kind: "once", date: a.date },
      photo: null,
      escalate: true,
    });
    setShowAppointmentForm(false);
  }

  function buildReport(): VisitReportData {
    const first = hwEvents.length ? Math.min(...hwEvents.map((e) => e.t)) : null;
    const sessionCount = hwEvents.filter((e) => e.kind === "session_start").length;
    return {
      generatedAt: Date.now(),
      person: { fullName: active.person?.fullName.trim() || active.name, age: ageFrom(active.person?.birthYear), usingSince: first, sessionCount },
      preparedBy: identity,
      appointment: upcoming,
      prep,
      rudas: [...rudas].sort((a, b) => b.date - a.date).map(({ date, total, administeredBy }) => ({ date, total, administeredBy })),
      trajectory,
      rhythm: computeRhythm(hwEvents),
      steadiness: computeSteadiness(hwEvents),
      medicines,
      words: w,
      medicationMarkers: markers,
    };
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--ink)]">Doctor visit</h1>
        <p className="mt-1 text-[var(--ink)]">Prepare before the appointment, take a report, and record what was said after.</p>
      </header>

      {followUp && !showAfterVisit && (
        <section className="rounded-[6px] border-2 border-[var(--accent)] bg-[var(--parchment)] p-5">
          <p className="text-lg text-[var(--ink)]">How did the visit with {followUp.doctorName} go?</p>
          <button onClick={() => setShowAfterVisit(true)} className={`${primaryBtn} mt-3`}>
            Add what happened
          </button>
        </section>
      )}
      {followUp && showAfterVisit && (
        <AfterVisitForm
          appointment={followUp}
          onCancel={() => setShowAfterVisit(false)}
          onSave={(r) => {
            const record: VisitRecord = { ...r, id: `visit${Date.now().toString(36)}`, recordedAt: Date.now() };
            setVisitRecords((prev) => [...prev, record]);
            if (r.nextAppointmentDate) {
              saveAppointment({ id: `appt${Date.now().toString(36)}`, doctorName: followUp.doctorName, speciality: followUp.speciality, date: r.nextAppointmentDate, place: followUp.place, createdAt: Date.now() });
            }
            setShowAfterVisit(false);
          }}
        />
      )}

      <section className="rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Appointment</h2>
        {showAppointmentForm ? (
          <div className="mt-3">
            <AppointmentForm
              initial={upcoming}
              onCancel={() => setShowAppointmentForm(false)}
              onSave={saveAppointment}
              onRemove={upcoming ? () => { setAppointments((prev) => prev.filter((a) => a.id !== upcoming.id)); setShowAppointmentForm(false); } : undefined}
            />
          </div>
        ) : upcoming ? (
          <div className="mt-2">
            <p className="text-lg text-[var(--ink)]">{appointmentLine(upcoming)}</p>
            {upcoming.speciality && <p className="text-base text-[var(--ink-soft)]">{upcoming.speciality}</p>}
            {upcoming.place && <p className="text-base text-[var(--ink-soft)]">{upcoming.place}</p>}
            <button onClick={() => setShowAppointmentForm(true)} className={`${secondaryBtn} mt-3`}>
              Edit
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-lg text-[var(--ink)]">No appointment scheduled yet.</p>
            <button onClick={() => setShowAppointmentForm(true)} className={`${primaryBtn} mt-3`}>
              Add an appointment
            </button>
          </div>
        )}
      </section>

      <section className="rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Prepare</h2>
        <p className="mt-1 text-base text-[var(--ink)]">
          Seven short questions about the last few months. All skippable — answer what you can, while there's time to think.
        </p>
        <button onClick={() => setShowPrep(true)} className={`${primaryBtn} mt-3`}>
          {prep.worries || prep.sleep || prep.mood || prep.falls ? "Continue preparing" : "Start preparing"}
        </button>
      </section>

      <section className="rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Report</h2>
        <p className="mt-1 text-base text-[var(--ink)]">One page, ready to print or send — caregiver observations first, then what the app has measured.</p>
        <button onClick={() => setShowReport(true)} className={`${secondaryBtn} mt-3`}>
          View report
        </button>
      </section>

      <section className="rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Prepared by</h2>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className={field} placeholder="Your name" value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} />
          <input className={field} placeholder="Your relationship to her, e.g. daughter" value={identity.relationship} onChange={(e) => setIdentity({ ...identity, relationship: e.target.value })} />
        </div>
      </section>

      {visitRecords.length > 0 && (
        <section className="rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Past visits</h2>
          <ul className="mt-2 space-y-2">
            {[...visitRecords]
              .sort((a, b) => b.visitDate - a.visitDate)
              .map((r) => (
                <li key={r.id} className="text-base text-[var(--ink)]">
                  {new Date(r.visitDate).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })} —{" "}
                  {r.changes.length ? r.changes.map((c) => VISIT_CHANGE_LABEL[c]).join(", ") : "No changes recorded"}
                </li>
              ))}
          </ul>
        </section>
      )}

      {showPrep && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-[var(--parchment2)]">
          <div className="sticky top-0 z-10 flex justify-end border-b-2 border-[var(--parchment2)] bg-[var(--parchment)] px-4 py-2">
            <button onClick={() => setShowPrep(false)} className={secondaryBtn}>
              Close
            </button>
          </div>
          <PrepWizard initial={prep} medicines={medicines} onSave={setPrep} onClose={() => setShowPrep(false)} />
        </div>
      )}

      {showReport && <VisitReportView data={buildReport()} onClose={() => setShowReport(false)} />}
    </div>
  );
}
