/**
 * ONE CHART, TWO READS: the measured weekly trend alongside the caregiver's own "how did
 * that feel?" markers, on the same time axis. The caregiver sees the person all day; the
 * app sees ten minutes a day. Agreement and disagreement are both worth showing plainly —
 * see src/game/mood/mood.ts for how the sentence below is chosen.
 */
import type { Trajectory } from "../../game/trajectory/trajectory";
import type { MoodEntry, MoodComparison } from "../../game/mood/mood";
import { moodValue } from "../../game/mood/mood";
import { formatDay } from "../../game/trajectory/trajectory";

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const W = 640;
const H = 120;

const MOOD_DOT: Record<MoodEntry["read"], string> = {
  easier: "var(--good)",
  same: "var(--ink-soft)",
  harder: "var(--watch)",
};
const MOOD_WORD: Record<MoodEntry["read"], string> = {
  easier: "felt easier than usual",
  same: "felt about the same",
  harder: "felt harder",
};

function weeklyMeasured(activities: { t: number; cue: number }[], from: number, to: number): { day: number; value: number }[] {
  const out: { day: number; value: number }[] = [];
  for (let start = from; start < to; start += WEEK) {
    const end = start + WEEK;
    const inWeek = activities.filter((a) => a.t >= start && a.t < end);
    if (inWeek.length) {
      const value = inWeek.reduce((s, a) => s + (1 - Math.min(4, Math.max(0, a.cue)) / 4), 0) / inWeek.length;
      out.push({ day: start + WEEK / 2, value });
    }
  }
  return out;
}

export function MoodTrajectoryChart({
  trajectory,
  activities,
  moodEntries,
  comparison,
  now = Date.now(),
}: {
  trajectory: Extract<Trajectory, { state: "ready" }>;
  activities: { t: number; cue: number }[];
  moodEntries: MoodEntry[];
  comparison: MoodComparison | null;
  now?: number;
}) {
  const from = trajectory.firstDay;
  const to = now;
  const span = Math.max(DAY, to - from);
  const x = (t: number) => ((t - from) / span) * (W - 12) + 6;
  const y = (v: number) => (1 - v) * (H - 16) + 8;

  const measured = weeklyMeasured(activities, from, to);
  const line = measured.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const marks = moodEntries.filter((m) => m.at >= from && m.at <= to).sort((a, b) => a.at - b.at);
  const moodLine = marks.map((m, i) => `${i ? "L" : "M"}${x(m.at).toFixed(1)},${y(moodValue(m.read)).toFixed(1)}`).join(" ");

  const alt = `Measured activity independence and the caregiver's own mood reads, week by week from ${formatDay(from)} to ${formatDay(to)}.`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        role="img"
        aria-label={alt}
        style={{ display: "block", background: "var(--parchment)", border: "2px solid var(--parchment2)", borderRadius: 6 }}
      >
        <title>{alt}</title>
        {line && <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />}
        {moodLine && <path d={moodLine} fill="none" stroke="var(--ink-soft)" strokeWidth={1.25} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
        {marks.map((m) => (
          <circle key={m.sessionId} cx={x(m.at)} cy={y(moodValue(m.read))} r={4} fill={MOOD_DOT[m.read]} stroke="var(--parchment)" strokeWidth={1}>
            <title>{`${formatDay(m.at)}: ${MOOD_WORD[m.read]}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-[var(--ink-soft)]">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-0.5 w-4 rounded" style={{ background: "var(--accent)" }} />
          What's measured, week by week
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--watch)" }} />
          The caregiver's own read after each session
        </span>
      </div>
      {comparison && <p className="mt-3 text-lg text-[var(--ink)]">{comparison.sentence}</p>}
    </div>
  );
}
