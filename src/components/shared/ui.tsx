import type { ReactNode } from "react";

/**
 * Shared pieces for the caregiver and health-worker screens: the LOOM palette, a 6px
 * radius ceiling (this is a pixel-art game, not a rounded admin panel), and a 14px floor.
 * The accent comes from CSS variables set by each console (.theme-care / .theme-asha in
 * index.css), so the two consoles are never confused at a glance.
 */
export const primaryBtn =
  "rounded-[6px] bg-[var(--accent)] px-5 py-3 text-base font-bold text-[var(--on-accent)] shadow-[0_3px_0_var(--accent-shadow)] transition hover:bg-[var(--accent-hover)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] active:translate-y-0.5 disabled:opacity-60";
export const secondaryBtn =
  "rounded-[6px] border-2 border-[var(--ink-soft)] bg-[var(--parchment)] px-4 py-2 text-base font-semibold text-[var(--ink)] hover:bg-[var(--parchment2)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:opacity-60";
export const quietBtn =
  "rounded-[6px] px-3 py-2 text-sm font-medium text-[var(--ink-soft)] underline underline-offset-2 hover:bg-[var(--ink)]/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]";
export const field =
  "w-full rounded-[6px] border-2 border-[var(--ink-soft)] bg-[var(--parchment)] px-3 py-2.5 text-base text-[var(--ink)] focus:border-[var(--accent-shadow)] focus:outline-none";

export function Page({ title, lead, actions, children }: { title: string; lead: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-[var(--ink)]">{title}</h1>
          <p className="mt-1 text-lg text-[var(--ink)]">{lead}</p>
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

/** Every section opens with one plain sentence, then the detail. A woven edge, not a shadow. */
export function Section({
  title,
  lead,
  children,
  className = "",
}: {
  title: string;
  lead: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`woven-border rounded-[6px] bg-[var(--parchment)] p-5 sm:p-6 ${className}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{title}</h2>
      <p className="mt-1 text-lg text-[var(--ink)]">{lead}</p>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

/** A length of woven cloth as a progress fill — the same motif as the patient side's cloth-length progress. */
export function ClothProgress({ fraction, label, height = 10 }: { fraction: number; label: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div className="cloth-progress rounded-[3px]" style={{ height }} role="img" aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export const longDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
