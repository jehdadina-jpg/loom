/**
 * HELP SHAPE — the distribution of cue levels behind the average, not just the average
 * itself. Two domains can share the same mean while meaning very different things: one
 * clustered at "a stronger visual cue" (recognition intact, recall harder) and one
 * clustered at "hands-on assistance" (both failing) look identical as a single number.
 * Never a subtype, never a named condition — the shape is shown in plain words, and a
 * clinician reads it.
 */
import { DOMAINS, DOMAIN_NAMES, type CognitiveDomain } from "../../data/domains";
import type { HealthWorkerEvent } from "../../health-worker/boundary";

const DAY = 86_400_000;
const WINDOW_MS = 21 * DAY;
const MIN_COUNT = 6;

/** Index 0-4, the same steps cueLabel() in telemetry/store.tsx describes. */
export const CUE_STEP_LABEL = ["independent", "a subtle visual cue", "a stronger visual cue", "clear step-by-step guidance", "hands-on assistance"];

export interface DomainShape {
  domain: CognitiveDomain;
  /** Counts at cue level 0..4, over the last three weeks. */
  counts: number[];
  total: number;
  /** Plain-language reading of this domain's shape; null when there isn't enough yet. */
  sentence: string | null;
}

function clampCue(c: number): number {
  return Math.max(0, Math.min(4, Math.round(c)));
}

function classify(counts: number[], total: number): string {
  const [c0, c1, c2, c3, c4] = counts;
  const mode = counts.indexOf(Math.max(...counts));
  if (mode === 2 && c2 / total >= 0.35) {
    return "She usually knows it once someone names it — recognition is holding up better than recall.";
  }
  if ((c3 + c4) / total >= 0.5) {
    return "Most activities are needing substantial guidance now.";
  }
  if ((c0 + c1) / total >= 0.6 && c4 >= Math.max(1, Math.round(0.1 * total))) {
    return "Usually independent, with occasional items that are simply gone.";
  }
  return "A mix of independent and guided attempts, without one pattern standing out.";
}

export function computeHelpShape(events: HealthWorkerEvent[], now = Date.now()): { shapes: DomainShape[]; headline: string } {
  const activities = events.filter(
    (e): e is Extract<HealthWorkerEvent, { kind: "activity" }> => e.kind === "activity" && now - e.t <= WINDOW_MS,
  );

  const shapes: DomainShape[] = DOMAINS.map((domain) => {
    const counts = [0, 0, 0, 0, 0];
    for (const a of activities) {
      if (a.domain !== domain) continue;
      counts[clampCue(a.cue)]++;
    }
    const total = counts.reduce((s, c) => s + c, 0);
    return { domain, counts, total, sentence: total >= MIN_COUNT ? classify(counts, total) : null };
  });

  const qualifying = shapes.filter((s) => s.sentence !== null);
  if (!qualifying.length) {
    return { shapes, headline: "Not enough activity in the last three weeks yet to show a pattern." };
  }

  // the recognition-vs-recall distinction is the most clinically specific finding, so it
  // leads when present; a domain needing substantial guidance across the board is next most
  // worth a doctor's attention; then the reassuring "mostly fine, occasionally gone" case.
  const priority = (s: DomainShape) => {
    if (!s.sentence) return 99;
    if (s.sentence.startsWith("She usually knows it")) return 0;
    if (s.sentence.startsWith("Most activities")) return 1;
    if (s.sentence.startsWith("Usually independent")) return 2;
    return 3;
  };
  const lead = [...qualifying].sort((a, b) => priority(a) - priority(b))[0];
  const headline = priority(lead) < 3 ? `${DOMAIN_NAMES[lead.domain]}: ${lead.sentence}` : "Help mostly follows one steady pattern across domains.";

  return { shapes, headline };
}
