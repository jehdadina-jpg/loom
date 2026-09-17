import type { ReactNode } from "react";

/**
 * Shared pieces for the caregiver and health-worker screens: warm palette, 14px floor.
 * The accent comes from CSS variables set by each console (.theme-care / .theme-asha in
 * index.css), so the two consoles are never confused at a glance.
 */
export const primaryBtn =
  "rounded-2xl bg-[var(--accent)] px-5 py-3 text-base font-bold text-[var(--on-accent)] shadow-[0_3px_0_var(--accent-shadow)] transition hover:bg-[var(--accent-hover)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] active:translate-y-0.5 disabled:opacity-60";
export const secondaryBtn =
  "rounded-xl border-2 border-[#d9c49b] bg-white px-4 py-2 text-base font-semibold text-[#2c1e14] hover:bg-[#fdf6e8] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] disabled:opacity-60";
export const quietBtn =
  "rounded-xl px-3 py-2 text-sm font-medium text-[#6b563a] underline underline-offset-2 hover:bg-black/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]";
export const field =
  "w-full rounded-xl border-2 border-[#d9c49b] bg-white px-3 py-2.5 text-base text-[#2c1e14] focus:border-[var(--accent-shadow)] focus:outline-none";

export function Page({ title, lead, actions, children }: { title: string; lead: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-[#2c1e14]">{title}</h1>
          <p className="mt-1 text-lg text-[#2c1e14]">{lead}</p>
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

/** Every section opens with one plain sentence, then the detail. */
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
    <section className={`rounded-2xl border border-[#e6d3ae] bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b563a]">{title}</h2>
      <p className="mt-1 text-lg text-[#2c1e14]">{lead}</p>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

export const longDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
