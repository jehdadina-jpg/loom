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
        className="animate-panel-in h-full w-full max-w-3xl overflow-y-auto overflow-x-hidden bg-slate-50 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex justify-end border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
          <button
            ref={closeRef}
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
