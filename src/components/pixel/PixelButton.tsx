import type { ReactNode } from "react";

export interface PixelButtonProps {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  size?: "lg" | "xl";
  tone?: "amber" | "leaf" | "wood";
  className?: string;
}

/** A chunky, high-contrast wooden button sized for easy targeting by elderly players. */
export function PixelButton({ children, onClick, icon, size = "lg", tone = "amber", className = "" }: PixelButtonProps) {
  const sizeCls = size === "xl" ? "min-h-24 px-8 text-2xl gap-3" : "min-h-16 px-6 text-lg gap-2";
  const bg = tone === "amber" ? "#b8791f" : tone === "leaf" ? "#3f7d40" : "#6d4a34";
  const border = tone === "amber" ? "#7a5410" : tone === "leaf" ? "#1b4022" : "#3e2723";
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center justify-center rounded-xl font-bold text-parchment shadow-[0_5px_0_var(--btn-border)] transition-all active:translate-y-1 active:shadow-[0_1px_0_var(--btn-border)] ${sizeCls} ${className}`}
      style={
        {
          backgroundColor: bg,
          "--btn-border": border,
          border: "3px solid rgba(0,0,0,0.25)",
          fontFamily: "var(--font-body)",
        } as React.CSSProperties
      }
    >
      <span className="pointer-events-none absolute inset-x-2 top-1 h-1/3 rounded-t-lg bg-white/15" />
      {icon && <span className="relative text-2xl leading-none">{icon}</span>}
      <span className="relative drop-shadow-[0_1px_0_rgba(0,0,0,0.35)]">{children}</span>
    </button>
  );
}
