import type { DaySummary } from "./store";

/**
 * Longitudinal pattern flags for the caregiver/health-worker Trends page.
 *
 * IMPORTANT: nothing here diagnoses anything. It compares recent play sessions to
 * earlier ones and describes *changes in engagement and support needed* — the same
 * kind of thing a caregiver would notice by eye over weeks of visits, just made
 * easier to see. Any flagged change is a prompt to mention it to a doctor, not a
 * conclusion on its own. Short histories, one-off bad days, tiredness, a new
 * activity, or simply an off day can all produce the same signal.
 */

export type TrendDirection = "improving" | "steady" | "worth-watching";

export interface TrendFlag {
  metric: "support-needed" | "navigation" | "engagement-frequency";
  direction: TrendDirection;
  headline: string;
  detail: string;
}

function average(nums: number[]): number {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

/**
 * Splits history into an "earlier" and "recent" window and compares them. Needs at
 * least 6 days of any recorded activity before it will flag anything — short of
 * that, differences are noise, not a pattern.
 */
export function computeTrendFlags(history: DaySummary[]): TrendFlag[] {
  const withActivity = history.filter((d) => d.activities > 0);
  if (withActivity.length < 6) return [];

  const mid = Math.floor(withActivity.length / 2);
  const earlier = withActivity.slice(0, mid);
  const recent = withActivity.slice(mid);

  const flags: TrendFlag[] = [];

  const earlierCue = average(earlier.map((d) => d.avgCueLevel));
  const recentCue = average(recent.map((d) => d.avgCueLevel));
  const cueDelta = recentCue - earlierCue;
  if (cueDelta > 0.6) {
    flags.push({
      metric: "support-needed",
      direction: "worth-watching",
      headline: "Needing more prompting than a few weeks ago",
      detail:
        "Recent sessions have needed noticeably more visual cues to finish activities than earlier ones did. Worth mentioning at the next check-up, alongside your own observations at home.",
    });
  } else if (cueDelta < -0.5) {
    flags.push({
      metric: "support-needed",
      direction: "improving",
      headline: "Completing activities with less prompting",
      detail: "Recent sessions have needed fewer cues than earlier ones — a good sign to note.",
    });
  } else {
    flags.push({
      metric: "support-needed",
      direction: "steady",
      headline: "Support needed has stayed about the same",
      detail: "No notable change in how much prompting activities have needed recently.",
    });
  }

  const earlierMissRate = average(earlier.map((d) => d.misses / Math.max(1, d.activities)));
  const recentMissRate = average(recent.map((d) => d.misses / Math.max(1, d.activities)));
  if (recentMissRate - earlierMissRate > 0.8) {
    flags.push({
      metric: "navigation",
      direction: "worth-watching",
      headline: "More missed taps finding places in the village",
      detail:
        "Getting to familiar locations has taken more attempts lately than it used to. This can also simply mean the screen or device changed, or vision has shifted — worth ruling those out first.",
    });
  }

  const recentDays = recent.length;
  const earlierDays = earlier.length;
  if (recentDays > 0 && earlierDays > 0 && recentDays < earlierDays * 0.5) {
    flags.push({
      metric: "engagement-frequency",
      direction: "worth-watching",
      headline: "Fewer sessions recently than before",
      detail: "There have been noticeably fewer play sessions in the recent period. Worth checking in on interest, mood, or routine changes.",
    });
  }

  return flags;
}
