/**
 * RUDAS — the Rowland Universal Dementia Assessment Scale — as LOOM's clinical anchor.
 *
 * Chosen over MMSE because it is robust to education, gender and language, and a health
 * worker can administer it after brief training. The helper text here is a reminder of
 * each item, not a substitute for the official administration guide.
 *
 * LOOM records the item scores and the total, with a date and who gave it. It shows one
 * of two fixed messages and never turns a score into a label of any kind.
 */
import type { CognitiveDomain } from "../../data/domains";

export type RudasItemId = "memory" | "bodyOrientation" | "praxis" | "drawing" | "judgement" | "language";

export interface RudasItem {
  id: RudasItemId;
  label: string;
  max: number;
  instruction: string;
}

export const RUDAS_ITEMS: RudasItem[] = [
  {
    id: "memory",
    label: "Memory",
    max: 8,
    instruction:
      "Name four everyday shopping items and ask the person to repeat them. Ask for them again at the end of the assessment — 2 points for each one recalled.",
  },
  {
    id: "bodyOrientation",
    label: "Body orientation",
    max: 5,
    instruction:
      "Ask the person to point to parts of their own body and then yours, using left and right. 1 point for each correct response, up to 5.",
  },
  {
    id: "praxis",
    label: "Praxis",
    max: 2,
    instruction:
      "Show the alternating hand movement (one hand in a fist, the other flat, then swap) and ask them to copy it. 2 if done smoothly, 1 if partly, 0 if not.",
  },
  {
    id: "drawing",
    label: "Drawing",
    max: 3,
    instruction: "Ask them to copy the cube drawing. 1 point each for: a square base, the inner lines, and the outer lines.",
  },
  {
    id: "judgement",
    label: "Judgement",
    max: 4,
    instruction:
      "Ask how they would safely cross a busy road with no crossing. Score what they mention — looking, waiting for a gap, and crossing safely — up to 4.",
  },
  {
    id: "language",
    label: "Language",
    max: 8,
    instruction: "Ask them to name as many different animals as they can in one minute. 1 point per animal, up to 8.",
  },
];

export const RUDAS_MAX = 30;
export const RUDAS_THRESHOLD = 22;

export type RudasScores = Record<RudasItemId, number>;

export interface RudasRecord {
  id: string;
  /** When it was administered. */
  date: number;
  administeredBy: string;
  scores: RudasScores;
  total: number;
}

export function emptyScores(): RudasScores {
  return { memory: 0, bodyOrientation: 0, praxis: 0, drawing: 0, judgement: 0, language: 0 };
}

export function rudasTotal(scores: RudasScores): number {
  return RUDAS_ITEMS.reduce((s, item) => s + Math.min(item.max, Math.max(0, Math.round(scores[item.id] ?? 0))), 0);
}

/** The only two things LOOM ever says about a RUDAS result. */
export function rudasMessage(total: number): string {
  return total <= RUDAS_THRESHOLD
    ? "This score suggests a clinical assessment would be worthwhile. LOOM does not diagnose. Please share this with a doctor or health worker."
    : "No immediate concern from this screen. LOOM does not diagnose.";
}

export type StartingBand = "gentle" | "standard" | "fuller";

/**
 * Where each domain starts before the person has any history of their own, so the first
 * session is pitched roughly right instead of starting everyone in the middle. Their own
 * play replaces this as soon as it exists.
 */
export function startingBands(r: RudasRecord): Record<CognitiveDomain, StartingBand> {
  const s = r.scores;
  const ratios: Record<CognitiveDomain, number> = {
    memory: s.memory / 8,
    language: s.language / 8,
    visuospatial: (s.bodyOrientation + s.drawing) / 8,
    attention: (s.praxis + s.judgement) / 6,
    speed: r.total / RUDAS_MAX,
  };
  const capped = r.total <= RUDAS_THRESHOLD;
  const band = (x: number): StartingBand => (x < 0.5 ? "gentle" : x < 0.8 || capped ? "standard" : "fuller");
  return {
    memory: band(ratios.memory),
    language: band(ratios.language),
    visuospatial: band(ratios.visuospatial),
    attention: band(ratios.attention),
    speed: band(ratios.speed),
  };
}

export const RUDAS_KEY = "loom_rudas_v1";

export function latestRudas(records: RudasRecord[]): RudasRecord | null {
  return records.length ? [...records].sort((a, b) => b.date - a.date)[0] : null;
}
