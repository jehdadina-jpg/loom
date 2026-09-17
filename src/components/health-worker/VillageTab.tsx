import { Fragment, useState } from "react";
import { BASELINE_DAYS } from "../../game/trajectory/trajectory";
import { shortName } from "../../game/profiles/words";
import type { TriageRow } from "../../health-worker/village";
import type { AshaState } from "../../health-worker/ashaStore";
import { PersonPanel } from "./PersonPanel";
import { TriageMark } from "./triage";
import { field } from "../shared/ui";

type Filter = "all" | "attention" | "learning";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "attention", label: "Needs attention" },
  { id: "learning", label: "Still learning" },
];

export function VillageTab({
  rows,
  asha,
  setAsha,
  openId,
  setOpenId,
  onGenerate,
}: {
  rows: TriageRow[];
  asha: AshaState;
  setAsha: (next: AshaState) => void;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onGenerate: (row: TriageRow) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = rows.filter((r) =>
    filter === "all" ? true : filter === "attention" ? r.triage === "refer" || r.triage === "monitor" : r.triage === "wait",
  );

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const referredThisMonth = new Set(asha.referrals.filter((r) => r.at >= monthStart).map((r) => r.personId)).size;
  const toRefer = rows.filter((r) => r.triage === "refer");

  const lead =
    rows.length === 0
      ? "No one is enrolled yet."
      : toRefer.length
        ? `${toRefer.map((r) => shortName(r.record.person.fullName)).join(" and ")} ${toRefer.length > 1 ? "have" : "has"} changed enough against their own starting point to suggest a doctor's visit.`
        : "No one needs a referral right now.";

  return (
    <div className="space-y-5">
      <p className="text-lg text-[#1d2340]">{lead}</p>

      {/* counts of work done, for the health worker's own reporting — not scores about anyone */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Coverage">
        <Coverage label="Enrolled" value={rows.length} />
        <Coverage label={`With a complete ${BASELINE_DAYS}-day baseline`} value={rows.filter((r) => r.triage !== "wait").length} />
        <Coverage label="Referred this month" value={referredThisMonth} />
      </div>

      <section className="rounded-2xl border border-[#d8dcec] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base text-[#1d2340]">Steepest change first. People still being got to know come last, unranked.</p>
          <div role="group" aria-label="Show" className="inline-flex flex-wrap gap-1 rounded-xl border border-[#d8dcec] bg-[#f3f4f9] p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`rounded-lg px-3 py-1.5 text-base font-medium focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] ${
                  filter === f.id ? "bg-[var(--accent)] text-[var(--on-accent)]" : "text-[#4a5170] hover:bg-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="mt-4 text-base text-[#4a5170]">{filter === "learning" ? "Everyone enrolled has a starting point." : "No one here right now."}</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#e6e8f2]">
            {shown.map((row) => {
              const id = row.record.person.id;
              const isOpen = openId === id;
              const t = row.trajectory;
              return (
                <Fragment key={id}>
                  <li>
                    <button
                      onClick={() => setOpenId(isOpen ? null : id)}
                      aria-expanded={isOpen}
                      className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-xl px-2 py-3 text-left hover:bg-[#f3f4f9] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] md:grid-cols-[minmax(10rem,1.2fr)_3.5rem_2fr_12rem]"
                    >
                      <span className="text-lg font-semibold text-[#1d2340]">
                        {shortName(row.record.person.fullName)}
                        {row.record.sample && (
                          <span className="ml-2 rounded-full border border-dashed border-[#8c8fa6] px-2 text-sm font-normal text-[#4a5170]">sample</span>
                        )}
                      </span>
                      <span className="text-base text-[#4a5170]">{row.record.person.age ?? "—"}</span>
                      <span className="col-span-2 text-base text-[#1d2340] md:col-span-1">
                        {row.triage === "wait" ? "still getting to know" : row.reason}
                      </span>
                      <span className="col-span-2 md:col-span-1">
                        <TriageMark triage={row.triage} extra={t.state === "getting-to-know" ? `${t.daysSoFar} of ${t.daysNeeded} days` : undefined} />
                      </span>
                    </button>
                  </li>
                  {isOpen && (
                    <li className="pb-4">
                      <PersonPanel row={row} onGenerate={() => onGenerate(row)} />
                    </li>
                  )}
                </Fragment>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-base font-medium text-[#1d2340]">
          Your block
          <input value={asha.block} onChange={(e) => setAsha({ ...asha, block: e.target.value })} placeholder="e.g. Titabor" className={`${field} mt-2`} />
        </label>
        <label className="flex items-center gap-3 self-end rounded-xl border border-[#d8dcec] bg-white p-3 text-base text-[#1d2340]">
          <input
            type="checkbox"
            checked={asha.showSample}
            onChange={(e) => setAsha({ ...asha, showSample: e.target.checked })}
            className="h-5 w-5 accent-[var(--accent)]"
          />
          Include the sample village (invented people, for demonstration)
        </label>
      </div>
    </div>
  );
}

function Coverage({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#d8dcec] bg-white px-4 py-3">
      <p className="text-base text-[#4a5170]">{label}</p>
      <p className="text-2xl font-semibold text-[#1d2340]">{value}</p>
    </div>
  );
}
