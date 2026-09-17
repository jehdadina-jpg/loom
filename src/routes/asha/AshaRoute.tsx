/**
 * /asha — the health worker's triage console, with its own header and accent.
 *
 * It is mounted by App *outside* every family data provider (profiles, settings, session,
 * photos, telemetry, reminders, alerts). A vault hook called anywhere under this route has
 * no provider to read from and throws — so the boundary holds at runtime as well as in the
 * import graph checked by tests/boundary.test.ts.
 */
import { useMemo, useState } from "react";
import { readLocalRecords } from "../../health-worker/boundary";
import { sampleVillage } from "../../health-worker/sampleVillage";
import { triageVillage, type TriageRow } from "../../health-worker/village";
import { readAsha, writeAsha, type AshaState } from "../../health-worker/ashaStore";
import type { ReferralData } from "../../game/referral/referral";
import { VillageTab } from "../../components/health-worker/VillageTab";
import { ReferralsTab } from "../../components/health-worker/ReferralsTab";
import { healthWorkerReferral } from "../../components/health-worker/referralData";
import { ReferralView } from "../../components/referral/ReferralView";

export const ASHA_BOUNDARY_LINE =
  "You can see cognitive trends and referral suggestions. Personal photos, voice recordings and family details stay private to the family.";

type Tab = "village" | "referrals";

const TABS: { id: Tab; label: string }[] = [
  { id: "village", label: "Village" },
  { id: "referrals", label: "Referrals" },
];

export function AshaRoute({ onBackToTitle }: { onBackToTitle: () => void }) {
  const [asha, setAshaState] = useState<AshaState>(readAsha);
  const [tab, setTab] = useState<Tab>("village");
  const [openId, setOpenId] = useState<string | null>(null);
  const [referral, setReferral] = useState<ReferralData | null>(null);

  const setAsha = (next: AshaState) => {
    setAshaState(next);
    writeAsha(next);
  };

  const rows = useMemo(() => {
    const now = Date.now();
    return triageVillage([...readLocalRecords(localStorage), ...(asha.showSample ? sampleVillage(now) : [])], now);
  }, [asha.showSample]);

  function generate(row: TriageRow) {
    setReferral(healthWorkerReferral(row));
    setAsha({ ...asha, referrals: [...asha.referrals, { personId: row.record.person.id, at: Date.now() }] });
  }

  return (
    <div className="theme-asha flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-[#f3f4f9]">
      <header className="z-30 border-b-4 border-[var(--accent)] bg-white sm:sticky sm:top-0">
        <div className="mx-auto max-w-5xl px-4 pt-3 sm:px-6">
          <p className="flex flex-wrap items-center gap-x-2 text-lg text-[#1d2340]">
            <span className="font-pixel text-sm">LOOM</span>
            <span aria-hidden>·</span>
            <span className="font-semibold text-[var(--accent)]">Health Worker</span>
            <span aria-hidden>·</span>
            <span>{asha.block.trim() || "your block"}</span>
          </p>
          <p className="mt-1 text-base text-[#1d2340]">{ASHA_BOUNDARY_LINE}</p>
          <nav aria-label="Health worker" className="mt-3">
            <ul className="flex gap-1">
              {TABS.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setTab(t.id)}
                    aria-current={tab === t.id ? "page" : undefined}
                    className={`rounded-t-xl px-4 py-2 text-base font-semibold focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] ${
                      tab === t.id ? "bg-[var(--accent)] text-[var(--on-accent)]" : "text-[#4a5170] hover:bg-[#f3f4f9]"
                    }`}
                  >
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6">
        {tab === "village" ? (
          <VillageTab rows={rows} asha={asha} setAsha={setAsha} openId={openId} setOpenId={setOpenId} onGenerate={generate} />
        ) : (
          <ReferralsTab
            rows={rows}
            asha={asha}
            onGenerate={generate}
            onOpenInVillage={(id) => {
              setOpenId(id);
              setTab("village");
            }}
          />
        )}
      </main>

      <footer className="border-t border-[#d8dcec] bg-white">
        <div className="mx-auto flex max-w-5xl justify-end px-4 py-3 sm:px-6">
          <button onClick={onBackToTitle} className="rounded-lg px-3 py-2 text-sm text-[#4a5170] underline underline-offset-2 hover:bg-[#f3f4f9]">
            Title screen
          </button>
        </div>
      </footer>

      {referral && <ReferralView data={referral} onClose={() => setReferral(null)} />}
    </div>
  );
}
