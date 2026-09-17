import { formatDay } from "../../game/trajectory/trajectory";
import { shortName } from "../../game/profiles/words";
import type { TriageRow } from "../../health-worker/village";
import type { AshaState } from "../../health-worker/ashaStore";
import { longDate, primaryBtn, secondaryBtn } from "../shared/ui";
import { TriageMark } from "./triage";

const PEOPLE = ["No one", "One person", "Two people", "Three people", "Four people", "Five people", "Six people"];

/** People flagged for a referral, and the summaries already generated for them. */
export function ReferralsTab({
  rows,
  asha,
  onGenerate,
  onOpenInVillage,
}: {
  rows: TriageRow[];
  asha: AshaState;
  onGenerate: (row: TriageRow) => void;
  onOpenInVillage: (id: string) => void;
}) {
  const flagged = rows.filter((r) => r.triage === "refer");
  const generated = [...asha.referrals].sort((a, b) => b.at - a.at);
  const byId = new Map(rows.map((r) => [r.record.person.id, r]));

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#d8dcec] bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#4a5170]">Flagged for referral</h2>
        <p className="mt-1 text-lg text-[#1d2340]">
          {flagged.length === 0
            ? "No one is flagged right now."
            : `${PEOPLE[flagged.length] ?? "Several people"} ${flagged.length === 1 ? "has" : "have"} changed enough against their own starting point to suggest a doctor's visit.`}
        </p>
        {flagged.length > 0 && (
          <ul className="mt-3 divide-y divide-[#e6e8f2]">
            {flagged.map((row) => {
              const t = row.trajectory;
              const since = t.state === "ready" && t.moved.length ? Math.min(...t.moved.map((d) => d.since ?? Date.now())) : null;
              return (
                <li key={row.record.person.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onOpenInVillage(row.record.person.id)}
                      className="text-left text-lg font-semibold text-[#1d2340] underline-offset-2 hover:underline"
                    >
                      {shortName(row.record.person.fullName)}
                    </button>
                    <p className="text-base text-[#4a5170]">
                      {row.reason}
                      {since ? ` · since ${formatDay(since)}` : ""}
                    </p>
                  </div>
                  <TriageMark triage="refer" />
                  <button onClick={() => onGenerate(row)} className={primaryBtn}>
                    Generate referral summary
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[#d8dcec] bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#4a5170]">Summaries already generated</h2>
        <p className="mt-1 text-lg text-[#1d2340]">
          {generated.length === 0 ? "None generated yet." : "Opening one again shows the record as it stands today."}
        </p>
        {generated.length > 0 && (
          <ul className="mt-3 divide-y divide-[#e6e8f2]">
            {generated.map((g, i) => {
              const row = byId.get(g.personId);
              return (
                <li key={`${g.personId}-${g.at}-${i}`} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-[#1d2340]">{row ? shortName(row.record.person.fullName) : "No longer enrolled"}</p>
                    <p className="text-base text-[#4a5170]">Generated {longDate(g.at)}</p>
                  </div>
                  {row && (
                    <button onClick={() => onGenerate(row)} className={secondaryBtn}>
                      Open again
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
