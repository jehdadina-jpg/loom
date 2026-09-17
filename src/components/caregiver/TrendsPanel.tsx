import { useMemo } from "react";
import { useTelemetry, sessionHistory, cueLabel, type DaySummary } from "../../game/telemetry/store";
import { computeTrendFlags, type TrendFlag } from "../../game/telemetry/trends";
import { useAlerts } from "../../game/alerts/AlertsContext";
import { useProfile } from "../../game/profiles/ProfileContext";
import { personWords } from "../../game/profiles/words";
import { trajectorySentence } from "../../game/trajectory/trajectory";
import { StillGettingToKnow } from "../charts/DomainCharts";

const DIRECTION_STYLE: Record<TrendFlag["direction"], { dot: string; badge: string; word: string }> = {
  improving: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-800 border-emerald-200", word: "improving" },
  steady: { dot: "bg-sky-500", badge: "bg-sky-50 text-sky-800 border-sky-200", word: "steady" },
  "worth-watching": { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-900 border-amber-200", word: "worth watching" },
};

/** Day by day, in words and numbers — no bar lengths or colours to decode. */
function DayByDay({ history }: { history: DaySummary[] }) {
  const days = history.filter((d) => d.activities > 0).slice(-14).reverse();
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Activities completed and typical help needed on each recorded day, newest first</caption>
      <thead>
        <tr className="border-b border-slate-200 text-slate-500">
          <th scope="col" className="py-2 pr-3 font-medium">Day</th>
          <th scope="col" className="py-2 pr-3 font-medium">Activities done</th>
          <th scope="col" className="py-2 font-medium">Typical help needed</th>
        </tr>
      </thead>
      <tbody>
        {days.map((d) => (
          <tr key={d.dateKey} className="border-b border-slate-100 text-slate-700">
            <td className="py-2 pr-3">{d.label}</td>
            <td className="py-2 pr-3">{d.activities}</td>
            <td className="py-2">{cueLabel(d.avgCueLevel)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Longitudinal engagement patterns — explicitly observational. Nothing here appears until
 * the person has a 14-day starting point of their own.
 */
export function TrendsPanel() {
  const { events } = useTelemetry();
  const { trajectory } = useAlerts();
  const { active } = useProfile();
  const words = personWords(active.person);
  const history = useMemo(() => sessionHistory(events), [events]);
  const flags = useMemo(() => computeTrendFlags(history), [history]);
  const ready = trajectory.state === "ready";
  const watching = flags.filter((f) => f.direction === "worth-watching");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Trends Over Time</h1>
        <p className="mt-1 text-slate-700">{trajectorySentence(trajectory, words)}</p>
      </header>

      <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold text-amber-900">What this page can and can't tell you</p>
        <p className="mt-1 text-sm text-amber-900">
          This page describes patterns in how activities were played — nothing more. LOOM does not diagnose. A change here
          can mean many things: tiredness, a new activity, mood, vision or hearing, or an off day. Use it as a conversation
          starter with a doctor or health worker, never as a conclusion on its own.
        </p>
      </div>

      {!ready && trajectory.state === "getting-to-know" ? (
        <StillGettingToKnow trajectory={trajectory} words={words} />
      ) : (
        <>
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-slate-800">What's changed recently</h2>
            <p className="mb-4 text-slate-700">
              {watching.length === 0
                ? "Nothing stands out as worth watching compared with earlier weeks."
                : watching.length === 1
                  ? "One thing is worth keeping an eye on."
                  : "A few things are worth keeping an eye on."}
            </p>
            <ul className="space-y-3">
              {flags.map((f) => {
                const style = DIRECTION_STYLE[f.direction];
                return (
                  <li key={f.metric} className="flex items-start gap-3">
                    <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-800">{f.headline}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-sm font-medium ${style.badge}`}>{style.word}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">{f.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-slate-800">Day by Day</h2>
            <p className="mb-4 text-slate-700">
              {history.some((d) => d.activities > 0)
                ? `On the most recent day with activities, the typical help needed was ${cueLabel(history.filter((d) => d.activities > 0).slice(-1)[0].avgCueLevel)}.`
                : "No activities recorded on this device yet."}
            </p>
            <DayByDay history={history} />
          </section>
        </>
      )}
    </div>
  );
}
