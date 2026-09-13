import { useMemo } from "react";
import { useTelemetry, sessionHistory, type DaySummary } from "../../game/telemetry/store";
import { computeTrendFlags, type TrendFlag } from "../../game/telemetry/trends";

const DIRECTION_STYLE: Record<TrendFlag["direction"], { dot: string; badge: string }> = {
  improving: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  steady: { dot: "bg-sky-500", badge: "bg-sky-50 text-sky-700 border-sky-200" },
  "worth-watching": { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-800 border-amber-200" },
};

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 2;
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs text-slate-500">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/** A day-by-day chart of support level and activity count, oldest to newest. */
function HistoryChart({ history }: { history: DaySummary[] }) {
  if (history.length === 0) {
    return <p className="text-slate-500">No sessions recorded yet — this will fill in as the village gets visited.</p>;
  }
  const maxActivities = Math.max(1, ...history.map((d) => d.activities));
  return (
    <div className="space-y-2">
      {history.slice(-14).map((d) => (
        <div key={d.dateKey} className="grid grid-cols-[64px_1fr] items-center gap-3">
          <span className="text-xs font-medium text-slate-600">{d.label}</span>
          <div className="space-y-1">
            <Bar label="Activities" value={d.activities} max={maxActivities} color="#3f7d40" />
            <Bar label="Support" value={d.activities ? d.avgCueLevel : 0} max={4} color="#b8791f" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Longitudinal engagement patterns across every recorded day — explicitly observational. */
export function TrendsPanel() {
  const { events } = useTelemetry();
  const history = useMemo(() => sessionHistory(events), [events]);
  const flags = useMemo(() => computeTrendFlags(history), [history]);
  const daysWithActivity = history.filter((d) => d.activities > 0).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Trends Over Time</h1>
        <p className="mt-1 text-slate-500">How engagement and support needs have changed across recorded sessions.</p>
      </header>

      <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold text-amber-900">Not a diagnosis</p>
        <p className="mt-1 text-sm text-amber-800">
          This page describes patterns in how activities were played — nothing more. A change here can mean many
          things: tiredness, a new activity, mood, vision or hearing, or an off day, not just a cognitive change. Use
          it as a conversation starter with a doctor or health worker, never as a conclusion on its own, and never in
          place of a professional assessment.
        </p>
      </div>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">What's changed recently</h2>
        {daysWithActivity < 6 ? (
          <p className="text-slate-500">
            Patterns need at least a few weeks of sessions to say anything meaningful — right now there
            {daysWithActivity === 1 ? " is " : " are "}
            only {daysWithActivity} day{daysWithActivity === 1 ? "" : "s"} with recorded activity. Come back after more visits.
          </p>
        ) : (
          <ul className="space-y-3">
            {flags.map((f) => {
              const style = DIRECTION_STYLE[f.direction];
              return (
                <li key={f.metric} className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800">{f.headline}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${style.badge}`}>
                        {f.direction === "worth-watching" ? "worth watching" : f.direction}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{f.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Day by Day</h2>
        <p className="mb-4 text-sm text-slate-500">
          Activities completed and typical support level needed (independent to hands-on) for each recorded day.
        </p>
        <HistoryChart history={history} />
      </section>
    </div>
  );
}
