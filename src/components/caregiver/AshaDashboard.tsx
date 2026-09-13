import { useMemo } from "react";
import { useTelemetry, summarizeSession, cueLabel } from "../../game/telemetry/store";

/** Professional-facing view: patterns and engagement, deliberately free of diagnostic language. */
export function AshaDashboard() {
  const { events } = useTelemetry();
  const summary = useMemo(() => summarizeSession(events), [events]);

  const trendNote =
    summary.avgCueLevel <= 1.2
      ? "Engagement has been consistent, with the person completing activities largely independently."
      : summary.avgCueLevel <= 2.5
        ? "The person has generally needed light to moderate visual support to complete activities."
        : "The person has needed more substantial support recently — consider shorter, simpler sessions.";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Health Worker View</h1>
        <p className="text-slate-500">Session patterns for follow-up conversations — observational only, not a diagnosis.</p>
      </header>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-800">Engagement Pattern</h2>
        <p className="text-slate-700">{trendNote}</p>
      </section>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Sessions logged</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">{summary.sessionsToday}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Navigation deviations</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">{summary.totalNavigationMisses}</p>
          <p className="mt-1 text-xs text-slate-500">Taps that missed a location before finding it</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Typical support level</p>
          <p className="mt-1 text-xl font-bold capitalize text-slate-800">{cueLabel(summary.avgCueLevel)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Notes for the Next Visit</h2>
        <ul className="space-y-3">
          {summary.observations.map((obs, i) => (
            <li key={i} className="flex items-start gap-3 text-slate-700">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
              <span>{obs}</span>
            </li>
          ))}
          {summary.observations.length === 0 && <li className="text-slate-500">No session data yet.</li>}
        </ul>
      </section>

      <p className="mt-8 text-xs text-slate-500">
        These notes describe engagement and support needed during play — they are not a clinical assessment and should be
        combined with your own observation and judgement.
      </p>
    </div>
  );
}
