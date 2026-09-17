import type { ReminderCategory, ReminderLogEntry } from "./model";

/**
 * Reminder response latency — how long from a card appearing to "Done".
 *
 * Drift in this over weeks is a behavioural signal for the D3 trajectory work. It is a
 * caregiver/health-worker export only: never shown on the patient side, and never
 * turned into a judgement here. One slow week means nothing on its own.
 */
export interface LatencyWeek {
  /** Monday of the week, local date "YYYY-MM-DD". */
  weekOf: string;
  category: ReminderCategory;
  responses: number;
  medianMs: number;
  /** Spread is kept, not smoothed away: for a fluctuating person the width is the finding. */
  p25Ms: number;
  p75Ms: number;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
}

function mondayOf(ts: number): string {
  const d = new Date(ts);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

export function weeklyResponseLatency(log: ReminderLogEntry[]): LatencyWeek[] {
  const buckets = new Map<string, { weekOf: string; category: ReminderCategory; values: number[] }>();
  for (const e of log) {
    if (e.type !== "done" || e.by !== "patient" || e.latencyMs == null) continue;
    const weekOf = mondayOf(e.timestamp);
    const id = `${weekOf}|${e.category}`;
    const b = buckets.get(id) ?? { weekOf, category: e.category, values: [] };
    b.values.push(e.latencyMs);
    buckets.set(id, b);
  }
  return [...buckets.values()]
    .map(({ weekOf, category, values }) => {
      const sorted = values.sort((a, b) => a - b);
      return {
        weekOf,
        category,
        responses: sorted.length,
        medianMs: quantile(sorted, 0.5),
        p25Ms: quantile(sorted, 0.25),
        p75Ms: quantile(sorted, 0.75),
      };
    })
    .sort((a, b) => a.weekOf.localeCompare(b.weekOf) || a.category.localeCompare(b.category));
}
