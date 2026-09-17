import { DOMAIN_NAMES } from "../../data/domains";
import { formatDay, PATTERN_WORDS, trajectorySentence } from "../../game/trajectory/trajectory";
import { personWords } from "../../game/profiles/words";
import { sessionDirection, wayfindingDirection, type TriageRow } from "../../health-worker/village";
import { DomainCharts, StillGettingToKnow } from "../charts/DomainCharts";
import { longDate, primaryBtn } from "../shared/ui";

/**
 * One person, opened in place under their row. A trend, directions and a sentence —
 * no counts of sessions or of extra taps.
 */
export function PersonPanel({ row, onGenerate }: { row: TriageRow; onGenerate: () => void }) {
  const { person, events } = row.record;
  const t = row.trajectory;
  const w = personWords(person);
  const rudas = events.filter((e): e is Extract<typeof e, { kind: "rudas" }> => e.kind === "rudas").sort((a, b) => b.t - a.t);

  return (
    <div className="space-y-4 rounded-2xl border border-[#d8dcec] bg-[#f8f9fd] p-4 sm:p-5">
      <p className="text-base text-[#4a5170]">
        {person.age ? `${person.age} · ` : ""}enrolled {longDate(person.enrolledAt)}
        {row.record.sample ? " · sample person" : ""}
      </p>

      {t.state === "ready" ? (
        <>
          <p className="text-lg text-[#1d2340]">{trajectorySentence(t, w)}</p>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#4a5170]">Which domains moved, and when</h3>
            <p className="mt-1 text-base text-[#1d2340]">
              {t.moved.length ? `${t.moved.length === 1 ? "One domain has" : "Some domains have"} moved away from ${w.possessive} own usual.` : `Nothing has moved away from ${w.possessive} own usual.`}
            </p>
            {t.moved.length > 0 && (
              <ul className="mt-1 space-y-1 text-base text-[#1d2340]">
                {t.moved.map((d) => (
                  <li key={d.domain}>
                    <strong>{DOMAIN_NAMES[d.domain]}</strong>: {PATTERN_WORDS[d.pattern]}
                    {d.since ? `, since ${formatDay(d.since)}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#4a5170]">Sessions and finding the way</h3>
            <p className="mt-1 text-base text-[#1d2340]">{sessionDirection(events)}</p>
            <p className="text-base text-[#1d2340]">{wayfindingDirection(events)}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#4a5170]">Five domains against own baseline</h3>
            <p className="mb-2 mt-1 text-base text-[#1d2340]">Each chart is compared only with this person's own first two weeks.</p>
            <DomainCharts trajectory={t} words={w} compact />
          </div>
        </>
      ) : (
        <StillGettingToKnow trajectory={t} words={w} />
      )}

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#4a5170]">RUDAS</h3>
        <p className="mt-1 text-base text-[#1d2340]">
          {rudas.length ? `Last given ${longDate(rudas[0].t)}: ${rudas[0].total} out of 30.` : "No RUDAS recorded yet."}
        </p>
        {rudas.length > 1 && (
          <ul className="text-base text-[#1d2340]">
            {rudas.slice(1).map((r) => (
              <li key={r.t}>
                {longDate(r.t)}: {r.total} out of 30
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={onGenerate} className={primaryBtn}>
        Generate referral summary
      </button>
    </div>
  );
}
