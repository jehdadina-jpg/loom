/**
 * DOCTOR VISIT — the appointment record. Speciality is free text on purpose: "the memory
 * doctor at the district hospital" is a valid, honest answer, not a dropdown to fight with.
 */
export interface Appointment {
  id: string;
  doctorName: string;
  /** Free text — a clinic name, a speciality, or however the family thinks of them. */
  speciality: string;
  /** The appointment date and time, as a single timestamp. */
  date: number;
  place: string;
  createdAt: number;
}

export const APPOINTMENTS_KEY = "loom_appointments_v1";

const DAY = 86_400_000;

/** The soonest appointment still ahead of now, regardless of how far off. */
export function nextAppointment(appointments: Appointment[], now = Date.now()): Appointment | null {
  const upcoming = appointments.filter((a) => a.date >= now).sort((a, b) => a.date - b.date);
  return upcoming[0] ?? null;
}

/** The soonest appointment within the given number of days — what Today surfaces. */
export function appointmentWithin(appointments: Appointment[], days: number, now = Date.now()): Appointment | null {
  const a = nextAppointment(appointments, now);
  return a && a.date - now <= days * DAY ? a : null;
}

/** The most recent appointment that has already happened, if any. */
export function lastPastAppointment(appointments: Appointment[], now = Date.now()): Appointment | null {
  const past = appointments.filter((a) => a.date < now).sort((a, b) => b.date - a.date);
  return past[0] ?? null;
}

export function appointmentLine(a: Appointment): string {
  const when = new Date(a.date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  return `${a.doctorName}, ${when}`;
}
