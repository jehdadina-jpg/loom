/**
 * THE VISIT REPORT — one printed page a PHC doctor can read in ninety seconds. Caregiver
 * observations come first, above everything the app measured: the person who lives with
 * her outranks the instrument, and this ordering is a statement about what the product
 * believes. See src/game/visit/prep.ts for how the noticed-lines and questions are built.
 */
import type { RudasRecord } from "../clinical/rudas";
import { trajectorySentence, type Trajectory, type Words } from "../trajectory/trajectory";
import { bestTimesText } from "../handover/handover";
import type { RhythmResult } from "../rhythm/rhythm";
import type { Steadiness } from "../trajectory/steadiness";
import type { Appointment } from "./appointment";
import { askQuestions, noticedLines, type PrepAnswers } from "./prep";

export const VISIT_REPORT_FOOTER =
  "LOOM does not diagnose. This is a record of observed change over time, prepared by the family to support a clinical conversation.";

export interface VisitReportData {
  generatedAt: number;
  person: { fullName: string; age: number | null; usingSince: number | null; sessionCount: number };
  preparedBy: { name: string; relationship: string };
  appointment: Appointment | null;
  prep: PrepAnswers | null;
  rudas: Pick<RudasRecord, "date" | "total" | "administeredBy">[];
  trajectory: Trajectory;
  rhythm: RhythmResult;
  steadiness: Steadiness;
  medicines: string[];
  words: Words;
  medicationMarkers: { date: number; label: string }[];
}

export function usingFor(since: number | null, now: number): string {
  if (!since) return "not yet started";
  const days = Math.max(1, Math.round((now - since) / 86_400_000));
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 70) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

const longDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

/** Plain-text version for pasting into a WhatsApp message. Same content, same order, same footer. */
export function visitReportText(d: VisitReportData): string {
  const lines: string[] = [];
  lines.push(`${d.person.fullName} — visit report`);
  lines.push(`${d.person.age !== null ? `${d.person.age} years old` : "Age not recorded"} · using LOOM since ${usingFor(d.person.usingSince, d.generatedAt)} · ${d.person.sessionCount} sessions`);
  lines.push(`Prepared by ${d.preparedBy.name || "the family"}${d.preparedBy.relationship ? `, ${d.preparedBy.relationship}` : ""}, on ${longDate(d.generatedAt)}`);
  if (d.appointment) {
    lines.push(`Appointment: ${d.appointment.doctorName}${d.appointment.speciality ? ` (${d.appointment.speciality})` : ""}, ${longDate(d.appointment.date)}${d.appointment.place ? ` at ${d.appointment.place}` : ""}`);
  }
  lines.push("");

  lines.push("WHAT THE FAMILY WANTS TO DISCUSS");
  const questions = d.prep ? askQuestions(d.prep) : [];
  if (questions.length) {
    questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
  } else {
    lines.push("No questions noted.");
  }
  if (d.prep?.worries.trim()) {
    lines.push("");
    lines.push(`What worries me most: ${d.prep.worries.trim()}`);
  }
  lines.push("");

  lines.push("WHAT THE CAREGIVER HAS NOTICED");
  const noticed = d.prep ? noticedLines(d.prep) : [];
  if (noticed.length) {
    for (const n of noticed) lines.push(`${n.label}: ${n.text}`);
  } else {
    lines.push("Nothing recorded yet.");
  }
  lines.push("");

  lines.push("WHAT THE APP HAS MEASURED");
  if (d.rudas.length === 0) {
    lines.push("RUDAS: not taken.");
  } else {
    lines.push(`RUDAS: ${d.rudas[0].total}/30 on ${longDate(d.rudas[0].date)}`);
    for (const r of d.rudas.slice(1)) lines.push(`  earlier: ${r.total}/30 on ${longDate(r.date)}`);
  }
  if (d.trajectory.state === "getting-to-know") {
    lines.push(`Still building a baseline — ${d.trajectory.daysSoFar} of ${d.trajectory.daysNeeded} days.`);
  } else {
    lines.push(`Her best hours: ${bestTimesText(d.rhythm)}`);
    if (d.steadiness.state === "ready") lines.push(`Steadiness: ${d.steadiness.sentence}`);
    if (d.medicationMarkers.length) {
      lines.push(`Medicine changes marked on the chart: ${d.medicationMarkers.map((m) => longDate(m.date)).join(", ")}`);
    }
  }
  lines.push("");

  lines.push("THE OBSERVATION");
  lines.push(trajectorySentence(d.trajectory, d.words));
  lines.push("");

  lines.push("CURRENT MEDICINES");
  if (d.medicines.length) {
    for (const m of d.medicines) lines.push(`- ${m}`);
  } else {
    lines.push("None recorded in LOOM.");
  }
  lines.push("");

  lines.push(VISIT_REPORT_FOOTER);
  return lines.join("\n");
}
