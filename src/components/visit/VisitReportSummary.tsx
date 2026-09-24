/**
 * THE VISIT REPORT — one printed page a PHC doctor can read in ninety seconds. Caregiver
 * observations come before app data on purpose: the person who lives with her outranks the
 * instrument, and the order on the page is a statement about what this product believes.
 * Rendered in the app for printing, and shareable as plain text — see
 * src/game/visit/report.ts for how every line here is built.
 */
import { DomainCharts } from "../charts/DomainCharts";
import { askQuestions, noticedLines, type PrepAnswers } from "../../game/visit/prep";
import { usageLine, VISIT_REPORT_FOOTER, type VisitReportData } from "../../game/visit/report";
import { trajectorySentence } from "../../game/trajectory/trajectory";
import { bestTimesText } from "../../game/handover/handover";

export const VISIT_REPORT_CSS = `
.loom-visit-report { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #2e2318; background: #f7efdc; max-width: 760px; margin: 0 auto; padding: 28px 32px; line-height: 1.45; }
.loom-visit-report h1 { font-size: 23px; margin: 0; }
.loom-visit-report h2 { font-size: 16px; margin: 18px 0 6px; border-bottom: 1px solid #e8dcc0; padding-bottom: 2px; }
.loom-visit-report p, .loom-visit-report li, .loom-visit-report td, .loom-visit-report th { font-size: 15px; }
.loom-visit-report .meta { color: #6b5d4a; font-size: 15px; margin: 2px 0 0; }
.loom-visit-report .worries { font-size: 16px; border-left: 4px solid #c25a2e; padding: 8px 12px; margin: 10px 0 0; background: #f7e4dc; border-radius: 0 6px 6px 0; font-weight: 600; }
.loom-visit-report .observation { font-size: 16px; border-left: 4px solid #f2b233; padding: 6px 12px; margin: 0; background: #e8dcc0; border-radius: 0 6px 6px 0; }
.loom-visit-report ol, .loom-visit-report ul { margin: 4px 0; padding-left: 22px; }
.loom-visit-report table { border-collapse: collapse; width: 100%; }
.loom-visit-report td, .loom-visit-report th { text-align: left; padding: 3px 8px 3px 0; border-bottom: 1px solid #e8dcc0; }
.loom-visit-report footer { margin-top: 18px; border-top: 2px solid #2e2318; padding-top: 8px; font-size: 15px; font-weight: 600; }
@media print {
  @page { size: A4; margin: 14mm; }
  .loom-visit-report { padding: 0; max-width: none; }
  .loom-visit-report h2 { margin-top: 12px; }
}
`;

const longDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

function NoticedList({ prep }: { prep: PrepAnswers | null }) {
  const lines = prep ? noticedLines(prep) : [];
  if (!lines.length) return <p>Nothing recorded yet.</p>;
  return (
    <ul>
      {lines.map((l) => (
        <li key={l.label}>
          <strong>{l.label}:</strong> {l.text}
        </li>
      ))}
    </ul>
  );
}

export function VisitReportSummary({ data }: { data: VisitReportData }) {
  const { person, preparedBy, appointment, prep, rudas, trajectory, rhythm, steadiness, medicines, words, medicationMarkers } = data;
  const questions = prep ? askQuestions(prep) : [];

  return (
    <article className="loom-visit-report">
      <header>
        <h1>{person.fullName} — visit report</h1>
        <p className="meta">
          {person.age !== null ? `${person.age} years old` : "Age not recorded"} · {usageLine(person.usingSince, data.generatedAt)} ·{" "}
          {person.sessionCount} sessions
        </p>
        <p className="meta">
          Prepared by {preparedBy.name || "the family"}
          {preparedBy.relationship ? `, ${preparedBy.relationship}` : ""}, on {longDate(data.generatedAt)}
        </p>
        {appointment && (
          <p className="meta">
            Appointment: {appointment.doctorName}
            {appointment.speciality ? ` (${appointment.speciality})` : ""}, {longDate(appointment.date)}
            {appointment.place ? ` at ${appointment.place}` : ""}
          </p>
        )}
      </header>

      <section>
        <h2>What the family wants to discuss</h2>
        {questions.length ? (
          <ol>
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        ) : (
          <p>No questions noted.</p>
        )}
        {prep?.worries.trim() && <p className="worries">What worries me most: {prep.worries.trim()}</p>}
      </section>

      <section>
        <h2>What the caregiver has noticed</h2>
        <NoticedList prep={prep} />
      </section>

      <section>
        <h2>What the app has measured</h2>
        {rudas.length === 0 ? (
          <p>RUDAS: not taken.</p>
        ) : (
          <p>
            RUDAS: {rudas[0].total}/30 on {longDate(rudas[0].date)}
            {rudas.length > 1 ? ` (earlier: ${rudas.slice(1).map((r) => `${r.total}/30 on ${longDate(r.date)}`).join("; ")})` : ""}
          </p>
        )}
        {trajectory.state === "getting-to-know" ? (
          <p>
            Still building a baseline — {trajectory.daysSoFar} of {trajectory.daysNeeded} days.
          </p>
        ) : (
          <>
            <DomainCharts trajectory={trajectory} words={words} compact now={data.generatedAt} medMarkers={medicationMarkers} />
            <p>Her best hours: {bestTimesText(rhythm)}</p>
            {steadiness.state === "ready" && <p>Steadiness: {steadiness.sentence}</p>}
          </>
        )}
      </section>

      <section>
        <h2>The observation</h2>
        <p className="observation">{trajectorySentence(trajectory, words)}</p>
      </section>

      <section>
        <h2>Current medicines</h2>
        {medicines.length ? (
          <ul>
            {medicines.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        ) : (
          <p>None recorded in LOOM.</p>
        )}
      </section>

      <footer>{VISIT_REPORT_FOOTER}</footer>
    </article>
  );
}
