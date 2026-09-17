/**
 * Full-screen preview with Print and Copy as text — no login needed to read it. Printing
 * hides the app entirely (see the print rules in index.css) so only the report reaches the
 * paper. See src/components/referral/ReferralView.tsx for the pattern this follows.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { VISIT_REPORT_CSS, VisitReportSummary } from "./VisitReportSummary";
import { visitReportText, type VisitReportData } from "../../game/visit/report";

const btn =
  "rounded-[6px] border-2 border-[var(--ink-soft)] bg-[var(--parchment)] px-4 py-2 text-base font-semibold text-[var(--ink)] hover:bg-[var(--parchment2)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]";

export function VisitReportView({ data, onClose }: { data: VisitReportData; onClose: () => void }) {
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("printing-visit-report");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("printing-visit-report");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(visitReportText(data));
      setNote("Copied. Paste it into a WhatsApp message.");
    } catch {
      setNote("Copying isn't allowed here.");
    }
  }

  return createPortal(
    <div
      className="theme-care visit-report-print-root fixed inset-0 z-[80] overflow-y-auto bg-[var(--parchment2)]"
      role="dialog"
      aria-modal="true"
      aria-label="Doctor visit report"
    >
      <style>{VISIT_REPORT_CSS}</style>
      <div className="no-print sticky top-0 z-10 border-b-2 border-[var(--ink-soft)] bg-[var(--parchment)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
          <p className="mr-auto text-base text-[var(--ink)]">Share this with the doctor. No login needed to read it.</p>
          <button onClick={() => window.print()} className={btn}>
            Print
          </button>
          <button onClick={() => void copy()} className={btn}>
            Copy as text
          </button>
          <button onClick={onClose} className={btn}>
            Close
          </button>
        </div>
        {note && (
          <p className="mx-auto max-w-3xl px-4 pb-3 text-base text-[var(--ink)]" role="status">
            {note}
          </p>
        )}
      </div>
      <div className="px-2 py-4 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-[6px] border-2 border-[var(--ink-soft)]">
          <VisitReportSummary data={data} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
