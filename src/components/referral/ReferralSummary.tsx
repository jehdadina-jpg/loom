/**
 * The one-page referral summary. Rendered in the app for printing, and rendered to a
 * standalone HTML file for sharing — which is why it uses its own small stylesheet and no
 * app contexts. A doctor needs a browser, nothing else.
 */
import { DomainCharts } from "../charts/DomainCharts";
import { observation, REFERRAL_FOOTER, usingFor, type ReferralData } from "../../game/referral/referral";

export const REFERRAL_CSS = `
.loom-referral { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #2c1e14; background: #fff; max-width: 760px; margin: 0 auto; padding: 28px 32px; line-height: 1.4; }
.loom-referral h1 { font-size: 22px; margin: 0; }
.loom-referral h2 { font-size: 16px; margin: 18px 0 6px; border-bottom: 1px solid #e6d3ae; padding-bottom: 2px; }
.loom-referral p, .loom-referral li, .loom-referral td, .loom-referral th { font-size: 14px; }
.loom-referral .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
.loom-referral .meta div { border: 1px solid #e6d3ae; border-radius: 8px; padding: 6px 10px; }
.loom-referral .meta span { display: block; font-size: 14px; color: #6b563a; }
.loom-referral .meta strong { font-size: 16px; }
.loom-referral .observation { font-size: 16px; border-left: 4px solid #2c1e14; padding: 6px 12px; margin: 0; background: #fbf5e9; }
.loom-referral table { border-collapse: collapse; width: 100%; }
.loom-referral td, .loom-referral th { text-align: left; padding: 3px 8px 3px 0; border-bottom: 1px solid #efe3cb; }
.loom-referral .notes { white-space: pre-wrap; margin: 0; }
.loom-referral footer { margin-top: 18px; border-top: 2px solid #2c1e14; padding-top: 8px; font-size: 15px; font-weight: 600; }
@media print {
  @page { size: A4; margin: 12mm; }
  .loom-referral { padding: 0; max-width: none; }
  .loom-referral h2 { margin-top: 10px; }
}
`;

const longDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export function ReferralSummary({ data }: { data: ReferralData }) {
  const { person, rudas, trajectory, words, audience } = data;
  return (
    <article className="loom-referral">
      <header>
        <h1>Summary for a clinical conversation</h1>
        <p style={{ margin: "2px 0 0", color: "#6b563a" }}>Prepared with LOOM on {longDate(data.generatedAt)}</p>
        <div className="meta">
          <div>
            <span>Name</span>
            <strong>{person.fullName}</strong>
          </div>
          <div>
            <span>Age</span>
            <strong>{person.age ?? "Not recorded"}</strong>
          </div>
          <div>
            <span>Using LOOM for</span>
            <strong>{usingFor(person.usingSince, data.generatedAt)}</strong>
          </div>
        </div>
      </header>

      <section>
        <h2>What has been observed</h2>
        <p className="observation">{observation(data)}</p>
      </section>

      <section>
        <h2>RUDAS</h2>
        {rudas.length === 0 ? (
          <p>No RUDAS has been recorded in LOOM.</p>
        ) : (
          <>
            <p style={{ margin: "0 0 4px" }}>
              Most recent: {rudas[0].total} out of 30 on {longDate(rudas[0].date)}.
            </p>
            <table>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Total (out of 30)</th>
                  <th scope="col">Given by</th>
                </tr>
              </thead>
              <tbody>
                {rudas.map((r) => (
                  <tr key={r.date}>
                    <td>{longDate(r.date)}</td>
                    <td>{r.total}</td>
                    <td>{r.administeredBy || "Not recorded"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section>
        <h2>Five activity domains, each against {words.possessive} own first two weeks</h2>
        <DomainCharts trajectory={trajectory} words={words} compact now={data.generatedAt} />
      </section>

      {audience === "family" && (
        <section>
          <h2>Noticed at home</h2>
          {data.homeNotes?.trim() ? <p className="notes">{data.homeNotes.trim()}</p> : <p>No notes recorded by the family.</p>}
        </section>
      )}

      <footer>{REFERRAL_FOOTER}</footer>
    </article>
  );
}
