/**
 * The time-of-day performance map: five domains × four windows, each cell read only
 * against this person's own average for that domain. Shared with the referral export, so
 * — like DomainCharts — it uses literal colours, not CSS variables, and needs no app
 * stylesheet to render correctly.
 *
 * Readable without colour: intensity carries the direction, but every cell also has a
 * native title (hover) and an aria-label naming the same thing in words.
 */
import { DOMAIN_NAMES, DOMAIN_THREAD } from "../../data/domains";
import { WINDOWS, type Cell, type RhythmResult, type Window } from "../../game/rhythm/rhythm";

const INK = "#2e2318";
const INK_SOFT = "#6b5d4a";
const PARCHMENT = "#f7efdc";
const PARCHMENT2 = "#e8dcc0";
const GOOD = "#6fa34f";
const WATCH = "#a8643b";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Cream at the centre, toward GOOD when a window needs less help than her own average, toward WATCH when it needs more. */
function cellFill(relative: number | null): string {
  if (relative === null) return PARCHMENT2;
  const base = hexToRgb(relative >= 0 ? GOOD : WATCH);
  const cream = hexToRgb(PARCHMENT);
  const t = Math.min(1, Math.abs(relative) / 0.3);
  const mix = base.map((c, i) => Math.round(cream[i] + (c - cream[i]) * t));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

const WINDOW_SHORT: Record<Window, string> = { morning: "Morning", midday: "Midday", afternoon: "Afternoon", evening: "Evening" };

export function RhythmHeatmap({ rhythm, compact }: { rhythm: Extract<RhythmResult, { state: "ready" }>; compact?: boolean }) {
  const byKey = new Map(rhythm.cells.map((c) => [`${c.domain}|${c.window}`, c]));
  const cellSize = compact ? 40 : 52;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontFamily: "inherit" }}>
        <caption style={{ captionSide: "top", textAlign: "left", fontSize: 14, color: INK_SOFT, padding: "0 0 8px", fontWeight: 400 }}>
          Each cell compares that time of day only with her own average for that kind of activity.
        </caption>
        <thead>
          <tr>
            <th scope="col" style={{ padding: 4 }} />
            {WINDOWS.map((w) => (
              <th key={w} scope="col" style={{ padding: 4, fontSize: 14, fontWeight: 600, color: INK, textAlign: "center" }}>
                {WINDOW_SHORT[w]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(Object.keys(DOMAIN_NAMES) as (keyof typeof DOMAIN_NAMES)[]).map((domain) => (
            <tr key={domain}>
              <th scope="row" style={{ padding: "4px 10px 4px 0", fontSize: 14, fontWeight: 600, color: INK, textAlign: "left", whiteSpace: "nowrap" }}>
                <span aria-hidden style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: DOMAIN_THREAD[domain], marginRight: 6 }} />
                {DOMAIN_NAMES[domain]}
              </th>
              {WINDOWS.map((w) => {
                const cell = byKey.get(`${domain}|${w}`) as Cell;
                return (
                  <td key={w} style={{ padding: 3 }}>
                    <div
                      role="img"
                      aria-label={cell.label}
                      title={cell.label}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        background: cellFill(cell.relative),
                        border: `1px solid ${PARCHMENT2}`,
                        borderRadius: 4,
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 14, color: INK_SOFT, margin: "8px 0 0" }}>
        Greener means less help than her own average for that window; more amber means more help. Pale cells don't yet
        have enough of that kind of activity in that window to compare.
      </p>
    </div>
  );
}
