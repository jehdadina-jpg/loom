/**
 * The five domains, each against the person's own baseline. Shared by the caregiver
 * alerts, the health-worker person view and the printable referral — which is why it
 * uses inline styles only (the referral is also saved as a standalone file) and imports
 * nothing but the trajectory model.
 *
 * Readable without colour: the baseline is a hatched band, the recent range is a flat
 * grey band, the average is a solid line, and every chart states its finding in words
 * beside it and in its accessible label.
 */
import { DOMAIN_NAMES } from "../../data/domains";
import {
  formatDay,
  PATTERN_WORDS,
  type DomainTrajectory,
  type Trajectory,
  type Words,
} from "../../game/trajectory/trajectory";

const DAY = 86_400_000;
const W = 320;
const H = 96;
const INK = "#2c1e14";
const MUTED = "#6b563a";

function recentWords(d: DomainTrajectory): string {
  if (!d.baseline) return "not enough of this kind of activity yet to compare";
  if (d.shift < -0.06) return "more help than in the first two weeks";
  if (d.shift > 0.06) return "less help than in the first two weeks";
  return "about the same help as in the first two weeks";
}

export function domainAltText(d: DomainTrajectory): string {
  const since = d.since && d.pattern !== "stable" ? ` since ${formatDay(d.since)}` : "";
  return `${DOMAIN_NAMES[d.domain]}: ${PATTERN_WORDS[d.pattern]}${since}. Lately, ${recentWords(d)}.`;
}

function DomainChart({ d, from, to, compact }: { d: DomainTrajectory; from: number; to: number; compact?: boolean }) {
  const span = Math.max(DAY, to - from);
  const x = (t: number) => ((t - from) / span) * W;
  const y = (v: number) => (1 - v) * (H - 8) + 4;
  const shown = d.rolling.filter((p) => p.day >= from);
  const dots = d.daily.filter((p) => p.day >= from);
  const band = shown.length
    ? `M${shown.map((p) => `${x(p.day).toFixed(1)},${y(p.high).toFixed(1)}`).join(" L")} L${[...shown]
        .reverse()
        .map((p) => `${x(p.day).toFixed(1)},${y(p.low).toFixed(1)}`)
        .join(" L")} Z`
    : "";
  const line = shown.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.mean).toFixed(1)}`).join(" ");
  const alt = domainAltText(d);
  const moved = d.pattern !== "stable";
  const patternId = `hatch-${d.domain}`;

  return (
    <figure style={{ margin: 0, breakInside: "avoid" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15, color: INK }}>{DOMAIN_NAMES[d.domain]}</strong>
        <span
          style={{
            fontSize: 14,
            color: INK,
            fontWeight: moved ? 700 : 400,
            border: `1px ${moved ? "solid" : "dashed"} ${MUTED}`,
            borderRadius: 999,
            padding: "0 8px",
          }}
        >
          {PATTERN_WORDS[d.pattern]}
          {moved && d.since ? ` · since ${formatDay(d.since)}` : ""}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 6, marginTop: 4 }}>
        <div
          aria-hidden
          style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 14, color: MUTED }}
        >
          <span>on own</span>
          <span>with help</span>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={compact ? 72 : 96}
          preserveAspectRatio="none"
          role="img"
          aria-label={alt}
          style={{ display: "block", background: "#fffdf8", border: `1px solid #e6d3ae`, borderRadius: 6 }}
        >
          <title>{alt}</title>
          <defs>
            <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke={MUTED} strokeWidth="1.2" opacity="0.45" />
            </pattern>
          </defs>
          {d.baseline && (
            <>
              <rect
                x={0}
                width={W}
                y={y(Math.min(1, d.baseline.mean + d.baseline.spread))}
                height={Math.max(2, y(Math.max(0, d.baseline.mean - d.baseline.spread)) - y(Math.min(1, d.baseline.mean + d.baseline.spread)))}
                fill={`url(#${patternId})`}
              />
              <line x1={0} x2={W} y1={y(d.baseline.mean)} y2={y(d.baseline.mean)} stroke={MUTED} strokeWidth="1.2" strokeDasharray="5 4" />
            </>
          )}
          {band && <path d={band} fill="#6b6259" opacity="0.22" />}
          {line && <path d={line} fill="none" stroke={INK} strokeWidth="2" vectorEffect="non-scaling-stroke" />}
          {dots.map((p) => (
            <circle key={p.day} cx={x(p.day)} cy={y(p.value)} r="1.6" fill={INK} opacity="0.55" />
          ))}
          {moved && d.since && d.since >= from && (
            <line x1={x(d.since)} x2={x(d.since)} y1={0} y2={H} stroke={INK} strokeWidth="1" strokeDasharray="2 3" />
          )}
        </svg>
      </div>
      <figcaption style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{recentWords(d).replace(/^./, (c) => c.toUpperCase())}.</figcaption>
    </figure>
  );
}

export function ChartKey() {
  return (
    <p style={{ fontSize: 14, color: MUTED, margin: "8px 0 0" }}>
      Hatched band and dashed line: the person's own first two weeks. Grey band: the range over each past week. Solid line:
      the week's average. Dotted upright line: when a change began. Higher means done more on their own.
    </p>
  );
}

export function DomainCharts({
  trajectory,
  words,
  weeks = 8,
  compact,
  now = Date.now(),
}: {
  trajectory: Trajectory;
  words: Words;
  weeks?: number;
  compact?: boolean;
  now?: number;
}) {
  if (trajectory.state === "getting-to-know") {
    return <StillGettingToKnow trajectory={trajectory} words={words} />;
  }
  const to = now;
  const from = Math.max(trajectory.firstDay, to - weeks * 7 * DAY);
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "repeat(auto-fill, minmax(220px, 1fr))" : "repeat(auto-fill, minmax(260px, 1fr))",
          gap: compact ? 10 : 16,
        }}
      >
        {trajectory.domains.map((d) => (
          <DomainChart key={d.domain} d={d} from={from} to={to} compact={compact} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: MUTED, marginTop: 6 }}>
        <span>From {formatDay(from)}</span>
        <span>to {formatDay(to)}</span>
      </div>
      <ChartKey />
    </div>
  );
}

/** Shown instead of any chart before the baseline exists. No trend, no colour, no ranking. */
export function StillGettingToKnow({
  trajectory,
  words,
}: {
  trajectory: Extract<Trajectory, { state: "getting-to-know" }>;
  words: Words;
}) {
  return (
    <div style={{ border: "1px dashed #d9c49b", borderRadius: 12, padding: 16, background: "#fffdf8" }}>
      <p style={{ margin: 0, fontSize: 16, color: INK }}>Still getting to know {words.object}.</p>
      <p style={{ margin: "4px 0 0", fontSize: 14, color: MUTED }}>
        {trajectory.daysSoFar} of {trajectory.daysNeeded} days so far. Nothing is compared, charted or ranked until{" "}
        {words.possessive} own starting point exists.
      </p>
    </div>
  );
}
