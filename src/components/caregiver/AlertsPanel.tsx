import { useState } from "react";
import { useAlerts, type AlertEntry } from "../../game/alerts/AlertsContext";
import type { AlertKind } from "../../game/alerts/derive";
import { useFamilyReferral } from "../../game/referral/useFamilyReferral";
import { useProfile } from "../../game/profiles/ProfileContext";
import { personWords } from "../../game/profiles/words";
import type { ReferralData } from "../../game/referral/referral";
import { DomainCharts } from "../charts/DomainCharts";
import { ReferralView } from "../referral/ReferralView";
import { longDate, Page, primaryBtn, quietBtn, secondaryBtn } from "../shared/ui";

const KIND_WORD: Record<AlertKind, string> = {
  referral: "Suggestion to see a doctor",
  reminder: "Reminder",
  session: "Sessions",
  "app-changed": "The app has changed",
};

/**
 * Everything that needs a human, newest first. Alerts are acknowledged, never deleted,
 * and nothing here counts them — no badges, no totals.
 */
export function AlertsPanel() {
  const { open, handled, trajectory } = useAlerts();
  const { active } = useProfile();
  const buildReferral = useFamilyReferral();
  const [referral, setReferral] = useState<ReferralData | null>(null);

  const lead =
    open.length === 0
      ? "Nothing needs you right now."
      : open.some((a) => a.kind === "referral")
        ? "There is a suggestion to talk to a doctor, and it's at the top."
        : "A few things are waiting for a look.";

  return (
    <Page
      title="Alerts"
      lead={lead}
      actions={
        <button onClick={() => setReferral(buildReferral())} className={secondaryBtn}>
          Make a summary for a doctor
        </button>
      }
    >
      {open.length > 0 && (
        <ul className="space-y-3">
          {[...open.filter((a) => a.kind === "referral"), ...open.filter((a) => a.kind !== "referral")].map((a) => (
            <AlertCard key={a.id} alert={a} onShare={() => setReferral(buildReferral())} />
          ))}
        </ul>
      )}

      {trajectory.state === "getting-to-know" && (
        <p className="mt-6 rounded-2xl border border-dashed border-[#d9c49b] bg-[#fffdf8] p-4 text-base text-[#2c1e14]">
          Still getting to know {personWords(active.person).object}: {trajectory.daysSoFar} of {trajectory.daysNeeded} days so far.
          Suggestions to see a doctor can only appear once there is a starting point to compare with.
        </p>
      )}

      <details className="mt-8 rounded-2xl border border-[#e6d3ae] bg-[#fdf6e8] p-5">
        <summary className="cursor-pointer text-base font-semibold text-[#2c1e14]">Handled</summary>
        <p className="mt-2 text-base text-[#6b563a]">
          {handled.length === 0 ? "Nothing handled yet." : "Everything that has been dealt with stays here. Nothing is deleted."}
        </p>
        <ul className="mt-3 space-y-3">
          {handled.map((a) => (
            <AlertCard key={a.id} alert={a} onShare={() => setReferral(buildReferral())} />
          ))}
        </ul>
      </details>

      {referral && <ReferralView data={referral} onClose={() => setReferral(null)} />}
    </Page>
  );
}

function AlertCard({ alert, onShare }: { alert: AlertEntry; onShare: () => void }) {
  const { acknowledge, keepEarlier, letAppAdjust, isPinned, trajectory } = useAlerts();
  const { active } = useProfile();
  const [showCharts, setShowCharts] = useState(false);
  const isOpen = !alert.handledAt;
  const pinned = alert.change ? isPinned(alert.change.domain) : false;

  return (
    <li className={`rounded-2xl border p-5 shadow-sm ${alert.kind === "referral" && isOpen ? "border-[#2c1e14] bg-white" : "border-[#e6d3ae] bg-white"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#6b563a]">{KIND_WORD[alert.kind]}</p>
        <p className="text-sm text-[#6b563a]">
          Raised {longDate(alert.raisedAt)}
          {alert.handledAt ? ` · handled ${longDate(alert.handledAt)}` : ""}
        </p>
      </div>
      <p className="mt-1 text-lg text-[#2c1e14]">{alert.sentence}</p>

      {alert.domains && alert.domains.length > 0 && (
        <p className="mt-2 text-base text-[#2c1e14]">
          <span className="text-[#6b563a]">Domains that moved: </span>
          {alert.domains.join(", ")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {alert.kind === "referral" && (
          <>
            <button onClick={onShare} className={primaryBtn}>
              Share with a doctor
            </button>
            <button onClick={() => setShowCharts((v) => !v)} className={secondaryBtn} aria-expanded={showCharts}>
              {showCharts ? "Hide the charts" : "See the charts"}
            </button>
          </>
        )}
        {alert.kind === "app-changed" &&
          alert.change &&
          (pinned ? (
            <button onClick={() => letAppAdjust(alert.change!.domain)} className={secondaryBtn}>
              Let the app adjust again
            </button>
          ) : (
            <button onClick={() => keepEarlier(alert)} className={secondaryBtn}>
              Keep the earlier setting
            </button>
          ))}
        {isOpen && (
          <button onClick={() => acknowledge(alert.id)} className={alert.kind === "referral" ? quietBtn : secondaryBtn}>
            {alert.kind === "app-changed" ? "Got it" : "Mark as handled"}
          </button>
        )}
      </div>
      {pinned && (
        <p className="mt-2 text-base text-[#6b563a]">You've fixed this setting. The app won't change it on its own until you let it.</p>
      )}

      {showCharts && (
        <div className="mt-4">
          <DomainCharts trajectory={trajectory} words={personWords(active.person)} />
        </div>
      )}
    </li>
  );
}
