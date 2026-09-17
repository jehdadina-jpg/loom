import { useEffect, useRef, type ReactNode } from "react";

/** A panel that opens over whatever is showing, so nobody loses their place. */
export function Drawer({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="animate-panel-in h-full w-full max-w-3xl overflow-y-auto overflow-x-hidden border-l-4 border-[var(--ink-soft)] bg-[var(--parchment2)]"
      >
        <div className="sticky top-0 z-10 flex justify-end border-b-2 border-[var(--parchment2)] bg-[var(--parchment)]/95 px-4 py-2 backdrop-blur">
          <button
            ref={closeRef}
            onClick={onClose}
            className="rounded-[6px] px-3 py-2 text-base font-medium text-[var(--ink)] hover:bg-[var(--parchment2)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
