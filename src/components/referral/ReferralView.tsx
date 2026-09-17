import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { REFERRAL_CSS, ReferralSummary } from "./ReferralSummary";
import { referralText, type ReferralData } from "../../game/referral/referral";

/** A standalone page: opens in any browser, prints cleanly, needs no login and no app. */
export function referralHtmlDocument(data: ReferralData): string {
  const body = renderToStaticMarkup(<ReferralSummary data={data} />);
  const title = `LOOM summary — ${data.person.fullName}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title.replace(/</g, "&lt;")}</title><style>body{margin:0;background:#f4efe6}${REFERRAL_CSS}</style></head><body>${body}</body></html>`;
}

const btn =
  "rounded-xl border-2 border-[#d9c49b] bg-white px-4 py-2 text-base font-semibold text-[#2c1e14] hover:bg-[#fdf6e8] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#6d4a34]";

/**
 * Full-screen preview with Print, Copy as text and Save as a file. Printing hides the app
 * entirely (see the print rules in index.css) so only the summary reaches the paper.
 */
export function ReferralView({ data, onClose, onShared }: { data: ReferralData; onClose: () => void; onShared?: () => void }) {
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("printing-referral");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("printing-referral");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(referralText(data));
      setNote("Copied. Paste it into a message to the doctor.");
      onShared?.();
    } catch {
      setNote("Copying isn't allowed here. Use Save as a file instead.");
    }
  }

  function save() {
    const blob = new Blob([referralHtmlDocument(data)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loom-summary-${data.person.fullName.replace(/\s+/g, "-").toLowerCase()}-${new Date(data.generatedAt).toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setNote("Saved. The file opens in any web browser — nothing to install.");
    onShared?.();
  }

  return createPortal(
    <div className="referral-print-root fixed inset-0 z-[80] overflow-y-auto bg-[#f4efe6]" role="dialog" aria-modal="true" aria-label="Referral summary">
      <style>{REFERRAL_CSS}</style>
      <div className="no-print sticky top-0 z-10 border-b border-[#e6d3ae] bg-[#fdf6e8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
          <p className="mr-auto text-base text-[#2c1e14]">Share this with a doctor. They won't need to install anything.</p>
          <button
            onClick={() => {
              window.print();
              onShared?.();
            }}
            className={btn}
          >
            Print
          </button>
          <button onClick={() => void copy()} className={btn}>
            Copy as text
          </button>
          <button onClick={save} className={btn}>
            Save as a file
          </button>
          <button onClick={onClose} className={btn}>
            Close
          </button>
        </div>
        {note && (
          <p className="mx-auto max-w-3xl px-4 pb-3 text-base text-[#2c1e14]" role="status">
            {note}
          </p>
        )}
      </div>
      <div className="px-2 py-4 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-xl shadow-lg">
          <ReferralSummary data={data} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
