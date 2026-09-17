/**
 * Appointments as a first-class record, the "once" reminder schedule that feeds the
 * appointment reminder category, and the visit-history helpers (medication markers,
 * pending follow-up).
 */
import { describe, expect, it } from "vitest";
import { appointmentLine, appointmentWithin, lastPastAppointment, nextAppointment, type Appointment } from "../src/game/visit/appointment";
import { medicationMarkers, pendingFollowUp, type VisitRecord } from "../src/game/visit/visitHistory";
import { describeSchedule, occurrencesOn, type Reminder } from "../src/game/reminders/model";

const DAY = 86_400_000;
const NOW = new Date(2026, 8, 17, 12, 0).getTime();

function appt(id: string, daysFromNow: number, overrides: Partial<Appointment> = {}): Appointment {
  return { id, doctorName: "Dr Baruah", speciality: "memory clinic", date: NOW + daysFromNow * DAY, place: "District hospital", createdAt: NOW, ...overrides };
}

describe("nextAppointment / appointmentWithin / lastPastAppointment", () => {
  it("finds the soonest appointment still ahead, regardless of how far off", () => {
    const list = [appt("a", 30), appt("b", 3), appt("c", 10)];
    expect(nextAppointment(list, NOW)?.id).toBe("b");
  });

  it("is null with nothing scheduled or everything in the past", () => {
    expect(nextAppointment([], NOW)).toBeNull();
    expect(nextAppointment([appt("a", -3)], NOW)).toBeNull();
  });

  it("only surfaces an appointment within the given window", () => {
    expect(appointmentWithin([appt("a", 5)], 7, NOW)?.id).toBe("a");
    expect(appointmentWithin([appt("a", 12)], 7, NOW)).toBeNull();
  });

  it("finds the most recent past appointment", () => {
    const list = [appt("a", -20), appt("b", -2), appt("c", 5)];
    expect(lastPastAppointment(list, NOW)?.id).toBe("b");
  });

  it("formats a plain line naming the doctor and the day", () => {
    const line = appointmentLine(appt("a", 3));
    expect(line).toContain("Dr Baruah");
    expect(line).not.toMatch(/diagnos|alzheimer|severe|moderate/i);
  });
});

describe("medicationMarkers", () => {
  const base = { appointmentId: "a1", recordedAt: NOW };
  it("marks only visits where a medicine actually changed", () => {
    const records: VisitRecord[] = [
      { ...base, id: "v1", visitDate: NOW - 10 * DAY, whatWasSaid: "", changes: ["medication-started"], nextAppointmentDate: null },
      { ...base, id: "v2", visitDate: NOW - 5 * DAY, whatWasSaid: "", changes: ["referred-onward"], nextAppointmentDate: null },
      { ...base, id: "v3", visitDate: NOW - 2 * DAY, whatWasSaid: "", changes: ["dose-changed"], nextAppointmentDate: null },
    ];
    const marks = medicationMarkers(records);
    expect(marks).toHaveLength(2);
    expect(marks.map((m) => m.date)).toEqual([NOW - 10 * DAY, NOW - 2 * DAY]);
  });

  it("labels every marker plainly, with no causal language", () => {
    const records: VisitRecord[] = [{ ...base, id: "v1", visitDate: NOW, whatWasSaid: "", changes: ["medication-stopped"], nextAppointmentDate: null }];
    const marks = medicationMarkers(records);
    expect(marks[0].label).toBe("medicine changed");
    expect(marks[0].label).not.toMatch(/since|caused|because|due to|led to|resulted/i);
  });

  it("is empty when nothing changed", () => {
    const records: VisitRecord[] = [{ ...base, id: "v1", visitDate: NOW, whatWasSaid: "", changes: ["no-change"], nextAppointmentDate: null }];
    expect(medicationMarkers(records)).toHaveLength(0);
  });
});

describe("pendingFollowUp", () => {
  it("finds a past appointment with no visit record yet", () => {
    const list = [appt("a", -5)];
    expect(pendingFollowUp(list, [], NOW)?.id).toBe("a");
  });

  it("is null once a visit record exists for it", () => {
    const list = [appt("a", -5)];
    const records: VisitRecord[] = [{ id: "v1", appointmentId: "a", visitDate: list[0].date, whatWasSaid: "", changes: [], nextAppointmentDate: null, recordedAt: NOW }];
    expect(pendingFollowUp(list, records, NOW)).toBeNull();
  });

  it("is null for a future appointment", () => {
    expect(pendingFollowUp([appt("a", 5)], [], NOW)).toBeNull();
  });
});

describe("the 'once' reminder schedule (feeds the appointment reminder category)", () => {
  const reminder: Reminder = {
    id: "r1",
    category: "appointment",
    label: "Dr Baruah — memory clinic",
    schedule: { kind: "once", date: NOW + 2 * DAY },
    photo: null,
    escalate: true,
    createdAt: NOW,
  };

  it("occurs only on its own calendar day", () => {
    const onDay = occurrencesOn(reminder, new Date(NOW + 2 * DAY));
    expect(onDay).toHaveLength(1);
    expect(onDay[0].scheduledFor).toBe(NOW + 2 * DAY);

    expect(occurrencesOn(reminder, new Date(NOW))).toHaveLength(0);
    expect(occurrencesOn(reminder, new Date(NOW + 3 * DAY))).toHaveLength(0);
  });

  it("describes itself with the exact date and time, once, not as a recurring habit", () => {
    const text = describeSchedule(reminder.schedule);
    expect(text).not.toMatch(/every day|weekly/i);
    expect(text).toMatch(/\d/);
  });
});
