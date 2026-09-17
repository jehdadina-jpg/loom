/**
 * STEADINESS — variance as a band width over time, not folded into an average. A stable
 * mean line with a widening band is exactly the pattern a mean-only chart hides. Portable
 * (literal hex): shared by the caregiver view and the standalone referral export. See
 * src/game/trajectory/steadiness.ts.
 */
import type { WeekBand } from "../../game/trajectory/steadiness";
import { formatDay } from "../../game/trajectory/trajectory";

const PARCHMENT = "#f7efdc";
const INK = "#2e2318";
const INK_SOFT = "#6b5d4a";
const ACCENT = "#f2b233";

const W = 640;
const H = 110;

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function SteadinessChart({ weeks, sentence }: { weeks: WeekBand[]; sentence: string }) {
  if (weeks.length < 2) return <p style={{ fontSize: 16, color: INK }}>{sentence}</p>;

  const from = weeks[0].day;
  const to = weeks[weeks.length - 1].day;
  const span = Math.max(1, to - from);
  const x = (t: number) => ((t - from) / span) * (W - 12) + 6;
  const y = (v: number) => (1 - v) * (H - 20) + 10;

  const top = weeks.map((w) => `${x(w.day).toFixed(1)},${y(Math.min(1, w.mean + w.spread)).toFixed(1)}`);
  const bottom = [...weeks].reverse().map((w) => `${x(w.day).toFixed(1)},${y(Math.max(0, w.mean - w.spread)).toFixed(1)}`);
  const band = `M${top.join(" L")} L${bottom.join(" L")} Z`;
  const line = weeks.map((w, i) => `${i ? "L" : "M"}${x(w.day).toFixed(1)},${y(w.mean).toFixed(1)}`).join(" ");

  const alt = `Weekly independence and its spread, ${formatDay(from)} to ${formatDay(to)}. ${sentence}`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        role="img"
        aria-label={alt}
        style={{ display: "block", background: PARCHMENT, border: `2px solid ${INK_SOFT}`, borderRadius: 6 }}
      >
        <title>{alt}</title>
        <path d={band} fill={hexToRgba(ACCENT, 0.25)} />
        <path d={line} fill="none" stroke={ACCENT} strokeWidth="2.25" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: INK_SOFT, marginTop: 4 }}>
        <span>From {formatDay(from)}</span>
        <span>to {formatDay(to)}</span>
      </div>
      <p style={{ fontSize: 16, color: INK, marginTop: 8 }}>{sentence}</p>
      <p style={{ fontSize: 14, color: INK_SOFT, marginTop: 2 }}>
        The line is her weekly average; the band around it is how much her days varied that week. A widening band
        with a flat line means the average alone would have looked steady.
      </p>
    </div>
  );
}
