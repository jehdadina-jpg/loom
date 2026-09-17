/**
 * The five domains, each against the person's own baseline. Shared by the caregiver
 * alerts, the health-worker person view and the printable referral — which is why it
 * uses inline styles and literal colours only (the referral is also saved as a
 * standalone file with no app stylesheet) and imports nothing but the trajectory model.
 *
 * Readable without colour: the baseline is a woven band, the recent range is a tinted
 * band, the average is a solid thread, and every chart states its finding in words
 * beside it and in its accessible label. Each domain keeps one fixed thread colour,
 * the same everywhere in the app.
 */
import { DOMAIN_NAMES, DOMAIN_THREAD } from "../../data/domains";
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

/* THE LOOM PALETTE — literal hex. Kept as JS constants (not CSS vars) so this file
   renders identically inside the app and inside the standalone referral export. */
const PARCHMENT = "#f7efdc";
const PARCHMENT2 = "#e8dcc0";
const WEAVE_DARK = "#d6c49c";
const INK = "#2e2318";
const INK_SOFT = "#6b5d4a";
const GOOD = "#6fa34f";
const GOOD_SOFT = "#e9f1e1";
const GOOD_INK = "#3f6b2c";
const WATCH = "#a8643b";
const WATCH_SOFT = "#f3e6dc";
const WATCH_INK = "#7a431e";

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function recentWords(d: DomainTrajectory): string {
  if (!d.baseline) return "not enough of this kind of activity yet to compare";
  if (d.shift < -0.06) return "more help than in the first two weeks";
  if (d.shift > 0.06) return "less help than in the first two weeks";
  return "about the same help as in the first two weeks";
}

export function domainAltText(d: DomainTrajectory, medMarkers: MedicationMarker[] = []): string {
  const since = d.since && d.pattern !== "stable" ? ` since ${formatDay(d.since)}` : "";
  const marks = medMarkers.length ? ` Medicine changed: ${medMarkers.map((m) => formatDay(m.date)).join(", ")}.` : "";
  return `${DOMAIN_NAMES[d.domain]}: ${PATTERN_WORDS[d.pattern]}${since}. Lately, ${recentWords(d)}.${marks}`;
}

/** A dated mark for a human to read, never a claim: this never says or implies the medicine caused anything. */
export interface MedicationMarker {
  date: number;
  label: string;
}

function DomainChart({
  d,
  from,
  to,
  compact,
  medMarkers = [],
}: {
  d: DomainTrajectory;
  from: number;
  to: number;
  compact?: boolean;
  medMarkers?: MedicationMarker[];
}) {
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
  const marksInRange = medMarkers.filter((m) => m.date >= from && m.date <= to);
  const alt = domainAltText(d, marksInRange);
  const moved = d.pattern !== "stable";
  const thread = DOMAIN_THREAD[d.domain];
  const weaveId = `weave-${d.domain}`;
  const badgeTone = moved ? { bg: WATCH_SOFT, ink: WATCH_INK, border: WATCH } : { bg: GOOD_SOFT, ink: GOOD_INK, border: GOOD };

  return (
    <figure style={{ margin: 0, breakInside: "avoid" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15, color: INK }}>
          <span aria-hidden style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: thread, marginRight: 6 }} />
          {DOMAIN_NAMES[d.domain]}
        </strong>
        <span
          style={{
            fontSize: 14,
            color: badgeTone.ink,
            fontWeight: moved ? 700 : 400,
            background: badgeTone.bg,
            border: `1px solid ${badgeTone.border}`,
            borderRadius: 6,
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
          style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 14, color: INK_SOFT }}
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
          style={{ display: "block", background: PARCHMENT, border: `2px solid ${INK_SOFT}`, borderRadius: 6 }}
        >
          <title>{alt}</title>
          <defs>
            {/* THE WEAVING MOTIF: a basket-weave tile in the parchment well colour, 2px warp
                over 2px weft, standing in for the baseline band instead of a flat grey box. */}
            <pattern id={weaveId} width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill={PARCHMENT2} />
              <rect x="0" y="0" width="2" height="2" fill={WEAVE_DARK} />
              <rect x="2" y="2" width="2" height="2" fill={WEAVE_DARK} />
            </pattern>
          </defs>
          {d.baseline && (
            <>
              <rect
                x={0}
                width={W}
                y={y(Math.min(1, d.baseline.mean + d.baseline.spread))}
                height={Math.max(2, y(Math.max(0, d.baseline.mean - d.baseline.spread)) - y(Math.min(1, d.baseline.mean + d.baseline.spread)))}
                fill={`url(#${weaveId})`}
              />
              <line x1={0} x2={W} y1={y(d.baseline.mean)} y2={y(d.baseline.mean)} stroke={INK_SOFT} strokeWidth="1.2" strokeDasharray="5 4" />
            </>
          )}
          {band && <path d={band} fill={hexToRgba(thread, 0.16)} />}
          {line && <path d={line} fill="none" stroke={thread} strokeWidth="2.25" vectorEffect="non-scaling-stroke" />}
          {dots.map((p) => (
            <circle key={p.day} cx={x(p.day)} cy={y(p.value)} r="1.8" fill={thread} />
          ))}
          {moved && d.since && d.since >= from && (
            <line x1={x(d.since)} x2={x(d.since)} y1={0} y2={H} stroke={WATCH} strokeWidth="1.4" strokeDasharray="2 3" />
          )}
          {marksInRange.map((m) => (
            <line key={m.date} x1={x(m.date)} x2={x(m.date)} y1={0} y2={H} stroke={INK} strokeWidth="1.6" />
          ))}
        </svg>
      </div>
      <figcaption style={{ fontSize: 14, color: INK_SOFT, marginTop: 4 }}>
        {recentWords(d).replace(/^./, (c) => c.toUpperCase())}.
        {marksInRange.length > 0 && ` Medicine changed: ${marksInRange.map((m) => formatDay(m.date)).join(", ")}.`}
      </figcaption>
    </figure>
  );
}

export function ChartKey() {
  return (
    <p style={{ fontSize: 14, color: INK_SOFT, margin: "8px 0 0" }}>
      Woven band and dashed line: the person's own first two weeks. Tinted band: the range over each past week. Solid
      thread: the week's average, in that domain's own colour. Dotted upright line: when a change began. A solid
      upright line marks a date a medicine changed — a marker to bring up with a doctor, not a claim about what it
      did. Higher means done more on their own.
    </p>
  );
}

export function DomainCharts({
  trajectory,
  words,
  weeks = 8,
  compact,
  now = Date.now(),
  medMarkers = [],
}: {
  trajectory: Trajectory;
  words: Words;
  weeks?: number;
  compact?: boolean;
  now?: number;
  medMarkers?: MedicationMarker[];
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
          <DomainChart key={d.domain} d={d} from={from} to={to} compact={compact} medMarkers={medMarkers} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: INK_SOFT, marginTop: 6 }}>
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
    <div style={{ border: `2px dashed ${INK_SOFT}`, borderRadius: 6, padding: 16, background: PARCHMENT }}>
      <p style={{ margin: 0, fontSize: 16, color: INK }}>Still getting to know {words.object}.</p>
      <p style={{ margin: "4px 0 0", fontSize: 14, color: INK_SOFT }}>
        {trajectory.daysSoFar} of {trajectory.daysNeeded} days so far. Nothing is compared, charted or ranked until{" "}
        {words.possessive} own starting point exists.
      </p>
    </div>
  );
}
