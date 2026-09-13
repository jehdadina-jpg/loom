import { useMemo } from "react";
import { useTelemetry, summarizeSession, sessionHistory, cueLabel, type DaySummary } from "../../game/telemetry/store";
import { useSession } from "../../game/session/SessionContext";
import { getActivity } from "../../data/activities";

const DOMAIN_LABELS: Record<string, string> = {
  memory: "Memory",
  attention: "Attention",
  speed: "Processing Speed",
  language: "Language",
  visuospatial: "Visuospatial",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Support-level trend. Lower bars mean more independence, so the axis is labelled that way. */
function SupportTrend({ data }: { data: DaySummary[] }) {
  if (data.length === 0) {
    return <p className="text-slate-500">Not enough sessions yet to show a pattern.</p>;
  }
  return (
    <div>
      <div className="flex h-40 items-end gap-3">
        {data.slice(-14).map((d) => {
          const pct = Math.max(6, (d.avgCueLevel / 4) * 100);
          const independent = d.avgCueLevel <= 1.2;
          return (
            <div key={d.dateKey} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end">
                <div
                  className={`w-full rounded-t-lg ${independent ? "bg-emerald-500" : d.avgCueLevel <= 2.5 ? "bg-amber-400" : "bg-orange-500"}`}
                  style={{ height: `${pct}%` }}
                  title={`${d.activities} activities · typically needed ${cueLabel(d.avgCueLevel)}`}
                />
              </div>
              <span className="text-xs text-slate-500">{d.label}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-slate-500">
        Shorter bars mean more was done independently. This is a record of support given — never a score.
      </p>
    </div>
  );
}

export function CaregiverDashboard() {
  const { events, clear } = useTelemetry();
  const { memories } = useSession();
  const summary = useMemo(() => summarizeSession(events), [events]);
  const history = useMemo(() => sessionHistory(events), [events]);
  const maxDomain = Math.max(1, ...Object.values(summary.domainCounts));

  function exportReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        activitiesCompleted: summary.totalActivities,
        typicalSupportNeeded: cueLabel(summary.avgCueLevel),
        navigationDeviations: summary.totalNavigationMisses,
        comfortVisits: summary.totalComfortVisits,
        domainsPracticed: summary.domainCounts,
      },
      observations: summary.observations,
      dailyHistory: history,
      albumNotes: memories.map((m) => ({ when: new Date(m.timestamp).toISOString(), note: m.note })),
      disclaimer:
        "Observational record of engagement and support during play. Not a clinical or diagnostic assessment.",
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loom-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Today's Session</h1>
          <p className="text-slate-500">A calm summary of how the visit went — no scores, just observations.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportReport}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Export report
          </button>
          <button
            onClick={clear}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
          >
            Reset demo data
          </button>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Activities completed" value={summary.totalActivities} />
        <StatCard label="Comfort visits" value={summary.totalComfortVisits} sub="Story, song or family voice" />
        <StatCard label="Typical help needed" value={cueLabel(summary.avgCueLevel)} isText />
      </div>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Observations</h2>
        <ul className="space-y-3">
          {summary.observations.map((obs, i) => (
            <li key={i} className="flex items-start gap-3 text-slate-700">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <span>{obs}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Support Needed Over Time</h2>
        <SupportTrend data={history} />
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Cognitive Domains Practiced</h2>
        <div className="space-y-3">
          {Object.entries(DOMAIN_LABELS).map(([key, label]) => {
            const count = summary.domainCounts[key] ?? 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm text-slate-600">{label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                    style={{ width: `${(count / maxDomain) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-sm text-slate-500">{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Recent Activity</h2>
        {summary.recentActivities.length === 0 ? (
          <p className="text-slate-500">Nothing recorded yet — activity will appear here as it happens.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {summary.recentActivities.map((a, i) => {
              const def = getActivity(a.activityId);
              return (
                <li key={i} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-slate-800">{def?.title ?? a.activityId}</p>
                    <p className="text-sm text-slate-500">
                      {DOMAIN_LABELS[a.domain] ?? a.domain} · needed {cueLabel(a.cueLevelReached)}
                    </p>
                  </div>
                  <span className="text-sm text-slate-500">{timeAgo(a.timestamp)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  isText,
}: {
  label: string;
  value: number | string;
  sub?: string;
  isText?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 font-bold text-slate-800 ${isText ? "text-xl capitalize" : "text-3xl"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
