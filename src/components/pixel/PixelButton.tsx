import type { ReactNode } from "react";

export interface PixelButtonProps {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  size?: "lg" | "xl";
  tone?: "amber" | "leaf" | "wood";
  className?: string;
}

/** A chunky, high-contrast, glowing wooden button sized for easy targeting by elderly players. */
export function PixelButton({ children, onClick, icon, size = "lg", tone = "amber", className = "" }: PixelButtonProps) {
  const sizeCls = size === "xl" ? "min-h-24 px-8 text-2xl gap-3" : "min-h-16 px-6 text-lg gap-2";
  const grad =
    tone === "amber"
      ? "linear-gradient(180deg,#f0af3f,#d8901f 45%,#a56814)"
      : tone === "leaf"
        ? "linear-gradient(180deg,#5fb055,#3f8a3a 45%,#256326)"
        : "linear-gradient(180deg,#8a6a4a,#6d4a34 45%,#4a3020)";
  const border = tone === "amber" ? "#7a5410" : tone === "leaf" ? "#1b4022" : "#3e2723";
  const glow = tone === "amber" ? "rgba(255,190,90,0.55)" : tone === "leaf" ? "rgba(120,230,120,0.5)" : "rgba(200,150,100,0.35)";
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center justify-center overflow-hidden rounded-xl font-bold text-parchment transition-all active:translate-y-1 active:shadow-[0_1px_0_var(--btn-border)] ${sizeCls} ${className}`}
      style={
        {
          background: grad,
          "--btn-border": border,
          border: "3px solid rgba(0,0,0,0.3)",
          fontFamily: "var(--font-body)",
          boxShadow: `0 5px 0 var(--btn-border), 0 6px 18px ${glow}, 0 0 0 1px rgba(255,255,255,0.06) inset`,
        } as React.CSSProperties
      }
    >
      <span className="pointer-events-none absolute inset-x-2 top-1 h-1/3 rounded-t-lg bg-white/25" />
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        aria-hidden
      />
      {icon && <span className="relative text-2xl leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">{icon}</span>}
      <span className="relative drop-shadow-[0_1px_0_rgba(0,0,0,0.45)]">{children}</span>
    </button>
  );
}
