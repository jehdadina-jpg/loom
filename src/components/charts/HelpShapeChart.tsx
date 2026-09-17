/**
 * HELP SHAPE — one stacked bar per domain, showing the last three weeks' cue levels as a
 * shape, not a single average. Portable (literal hex, no CSS variables): shared by the
 * caregiver view and the standalone referral export. See src/game/trajectory/helpShape.ts.
 */
import { DOMAIN_NAMES } from "../../data/domains";
import { CUE_STEP_LABEL, type DomainShape } from "../../game/trajectory/helpShape";

const INK = "#2e2318";
const INK_SOFT = "#6b5d4a";
const PARCHMENT2 = "#e8dcc0";

/** Five fixed steps, independent (green) through hands-on assistance (terracotta). */
const STEP_COLOR = ["#6fa34f", "#8fac5f", "#c9bb8e", "#bd8455", "#a8643b"];

const W = 320;
const H = 22;

function stepAlt(counts: number[], total: number): string {
  if (!total) return "not enough of this yet to compare";
  return counts.map((c, i) => (c ? `${c} at ${CUE_STEP_LABEL[i]}` : null)).filter(Boolean).join(", ");
}

function ShapeRow({ shape }: { shape: DomainShape }) {
  const alt = `${DOMAIN_NAMES[shape.domain]}: ${shape.total ? stepAlt(shape.counts, shape.total) : "not enough of this yet to compare"}.`;
  let x = 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: INK, marginBottom: 2 }}>
        <span>{DOMAIN_NAMES[shape.domain]}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={alt}
        style={{ display: "block", borderRadius: 4, overflow: "hidden", background: PARCHMENT2 }}
      >
        <title>{alt}</title>
        {shape.total === 0 ? (
          <rect x={0} y={0} width={W} height={H} fill={PARCHMENT2} />
        ) : (
          shape.counts.map((c, i) => {
            const w = (c / shape.total) * W;
            const rect = c ? <rect key={i} x={x} y={0} width={w} height={H} fill={STEP_COLOR[i]} /> : null;
            x += w;
            return rect;
          })
        )}
      </svg>
      {!shape.sentence && (
        <p style={{ fontSize: 14, color: INK_SOFT, margin: "2px 0 0" }}>Not enough of this yet to compare.</p>
      )}
    </div>
  );
}

export function HelpShapeChart({ shapes, headline }: { shapes: DomainShape[]; headline: string }) {
  return (
    <div>
      <p style={{ fontSize: 16, color: INK, margin: "0 0 10px", fontWeight: 600 }}>{headline}</p>
      {shapes.map((s) => (
        <ShapeRow key={s.domain} shape={s} />
      ))}
      <p style={{ fontSize: 14, color: INK_SOFT, margin: "6px 0 0" }}>
        Each bar is the last three weeks: greener is more independent, more terracotta is more help needed. The shape
        matters as much as the average — where it clusters shows what kind of help is actually needed.
      </p>
    </div>
  );
}
