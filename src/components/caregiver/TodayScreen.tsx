/**
 * TODAY — the caregiver's landing screen. Read at 11pm on a phone, and at 8am when
 * deciding whether to start a session. Whether today was fine is in the first sentence;
 * nothing here is a score, a proportion, an error count or a comparison with anyone else.
 */
import { useMemo, useState, type ReactNode } from "react";
import { useTelemetry, cueLabel } from "../../game/telemetry/store";
import { useReminders } from "../../game/reminders/ReminderContext";
import { occurrencesOn, occurrenceState, type OccurrenceState } from "../../game/reminders/model";
import { useAlerts } from "../../game/alerts/AlertsContext";
import { useProfile } from "../../game/profiles/ProfileContext";
import { personWords } from "../../game/profiles/words";
import { sessionRecords, formatDuration } from "../../game/session/history";
import { greeting, openingSentence, weekWord } from "../../game/today/today";
import { readRecordEvents } from "../../health-worker/boundary";
import { locationForActivity } from "../../data/activities";
import { PLACE_NAMES } from "../../data/places";
import { StartSessionButton } from "./SessionStarter";
import { RemindersPanel } from "./RemindersPanel";
import { Drawer } from "../shared/Drawer";

const DAY = 86_400_000;
const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

const startOfDay = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** "9:14am", "10am" */
function clock(t: number): string {
  const d = new Date(t);
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes();
  return `${h}${m ? `:${String(m).padStart(2, "0")}` : ""}${d.getHours() < 12 ? "am" : "pm"}`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const WEEK_LEAD: Record<ReturnType<typeof weekWord>, string> = {
  steady: "A steady week.",
  "harder than usual": "A harder week than usual.",
  "easier than usual": "An easier week than usual.",
  "up and down": "An up-and-down week.",
  "still getting to know": "Still getting to know {object}.",
};

interface Line {
  at: number;
  mark: "✓" | "⋯" | "●" | "○" | "·";
  /** Spoken to screen readers, and shown where the mark alone isn't obvious. */
  word: string;
  showWord: boolean;
  text: string;
  sub?: string;
}

const MARKS: Record<OccurrenceState, Pick<Line, "mark" | "word" | "showWord">> = {
  done: { mark: "✓", word: "done", showWord: false },
  due: { mark: "⋯", word: "due", showWord: true },
  upcoming: { mark: "⋯", word: "later", showWord: false },
  missed: { mark: "●", word: "missed", showWord: true },
};

export function TodayScreen({
  onStartSession,
  onOpenAlerts,
  onOpenProgress,
}: {
  onStartSession: () => void;
  onOpenAlerts: () => void;
  onOpenProgress: () => void;
}) {
  const { events } = useTelemetry();
  const { reminders, log, now } = useReminders();
  const { open, trajectory } = useAlerts();
  const { active, activeId } = useProfile();
  const [remindersOpen, setRemindersOpen] = useState(false);
  const w = personWords(active.person);

  const records = useMemo(() => sessionRecords(events), [events]);
  const today = startOfDay(now);
  const opening = openingSentence(records, w, now);

  const lines = useMemo<Line[]>(() => {
    const out: Line[] = [];
    for (const r of records.filter((s) => s.startedAt >= today)) {
      out.push({
        at: r.startedAt,
        mark: r.completed ? "✓" : "○",
        word: r.completed ? "done" : "set aside",
        showWord: !r.completed,
        text: `${clock(r.startedAt)} · ${formatDuration(r.endedAt - r.startedAt).replace(/^Under/, "under")}`,
        sub: PLACE_NAMES[locationForActivity(r.activityId)],
      });
    }
    for (const rem of reminders) {
      for (const o of occurrencesOn(rem, new Date(now))) {
        out.push({ at: o.scheduledFor, ...MARKS[occurrenceState(o, log, now)], text: `${cap(rem.label)}, ${clock(o.scheduledFor)}` });
      }
    }
    out.sort((a, b) => a.at - b.at);

    // the facts the old stat tiles carried, as plain lines
    const done = events.filter((e): e is Extract<typeof e, { type: "activity_complete" }> => e.type === "activity_complete" && e.timestamp >= today);
    if (done.length) {
      const typical = done.reduce((s, e) => s + e.cueLevelReached, 0) / done.length;
      out.push({
        at: now,
        mark: "·",
        word: "",
        showWord: false,
        text: `${WORDS[done.length] ?? "Several"} ${done.length === 1 ? "activity" : "activities"} done`,
        sub: typical < 0.5 ? "mostly without help" : `mostly with ${cueLabel(typical)}`,
      });
    }
    if (events.some((e) => e.type === "comfort" && e.timestamp >= today)) {
      out.push({ at: now, mark: "·", word: "", showWord: false, text: "Spent some quiet time at the water point" });
    }
    return out;
  }, [records, reminders, log, now, events, today]);

  const sessionsToday = records.filter((r) => r.startedAt >= today).length;
  const reminderStates = reminders.flatMap((rem) => occurrencesOn(rem, new Date(now)).map((o) => occurrenceState(o, log, now)));
  const remindersToday = reminderStates.length;
  const remindersOutstanding = reminderStates.some((st) => st !== "done");
  const todayLead =
    lines.length === 0
      ? "Nothing yet today."
      : `${sessionsToday === 0 ? "No session yet" : sessionsToday === 1 ? "One session" : `${WORDS[sessionsToday] ?? "Several"} sessions`}${
          remindersToday > 0 ? (remindersOutstanding ? ", and some reminders still to come." : ", and every reminder so far is done.") : "."
        }`;

  // a doorway to Progress, not a chart: one line and one word
  const word = weekWord(trajectory);
  const spark = useMemo(() => {
    if (trajectory.state !== "ready") return null;
    const acts = readRecordEvents(localStorage, activeId).filter((e): e is Extract<typeof e, { kind: "activity" }> => e.kind === "activity");
    return Array.from({ length: 7 }, (_, i) => {
      const day = today - (6 - i) * DAY;
      const inDay = acts.filter((a) => a.t >= day && a.t < day + DAY);
      return inDay.length ? inDay.reduce((s, a) => s + (1 - a.cue / 4), 0) / inDay.length : null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trajectory, activeId, today]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      <section className="rounded-2xl border border-[#e6d3ae] bg-[#fdf6e8] p-6 shadow-sm sm:p-8">
        <p className="text-lg text-[#6b563a]">{greeting(new Date(now))}</p>
        <h1 className="mt-1 text-2xl font-semibold leading-snug text-[#2c1e14]">{opening}</h1>
        <StartSessionButton
          onHandOver={onStartSession}
          className="mt-5 rounded-2xl bg-[var(--accent)] px-6 py-4 text-lg font-bold text-[var(--on-accent)] shadow-[0_4px_0_var(--accent-shadow)] transition hover:bg-[var(--accent-hover)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] active:translate-y-0.5"
        />
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card
          title="Today"
          lead={todayLead}
          action={
            <button onClick={() => setRemindersOpen(true)} className="rounded-lg px-2 py-1 text-sm font-medium text-[#6b563a] underline underline-offset-2 hover:bg-black/5">
              Reminders
            </button>
          }
        >
          {lines.length > 0 && (
            <ul className="space-y-2">
              {lines.map((l, i) => (
                <li key={i} className="flex gap-3 text-base text-[#2c1e14]">
                  <span aria-hidden className="w-4 shrink-0 text-center font-bold">
                    {l.mark}
                  </span>
                  <span>
                    {l.text}
                    {l.word && <span className={l.showWord ? "text-[#6b563a]" : "sr-only"}> · {l.word}</span>}
                    {l.sub && <span className="block text-[#6b563a]">{l.sub}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Needs you" lead={open.length ? "Something is waiting for you." : "Nothing needs you right now."}>
          {open.length > 0 && (
            <>
              <ul className="space-y-2">
                {open.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <button onClick={onOpenAlerts} className="w-full rounded-xl border border-[#e6d3ae] bg-[#fffdf8] px-3 py-2 text-left text-base text-[#2c1e14] hover:bg-[#fdf6e8]">
                      {a.sentence}
                    </button>
                  </li>
                ))}
              </ul>
              {open.length > 3 && (
                <button onClick={onOpenAlerts} className="mt-2 rounded-lg px-2 py-1 text-sm font-medium text-[#6b563a] underline underline-offset-2 hover:bg-black/5">
                  See the rest in alerts
                </button>
              )}
            </>
          )}
        </Card>
      </div>

      <Card
        title={`What ${w.subject === w.name ? cap(w.name) : w.subject} can still do`}
        lead="Coming soon."
        action={
          <button disabled aria-disabled className="rounded-lg border border-[#e6d3ae] px-3 py-1 text-sm text-[#6b563a] opacity-60" title="Coming soon">
            Share
          </button>
        }
      >
        <p className="text-base text-[#6b563a]">
          The things {w.name} still does well, gathered from {w.possessive} own sessions — something to share with the family.
        </p>
      </Card>

      <Card title="Things to talk about" lead="Coming soon.">
        <p className="text-base text-[#6b563a]">Conversation starters from today's sessions — the places visited and the things named.</p>
      </Card>

      <Card title="This week" lead={WEEK_LEAD[word].replace("{object}", w.object)}>
        <div className="flex flex-wrap items-center gap-4">
          {spark ? (
            <Sparkline values={spark} label={`This week, day by day: ${word}.`} />
          ) : (
            <p className="text-base text-[#6b563a]">A pattern appears after two weeks.</p>
          )}
          {spark && <span className="text-lg font-semibold text-[#2c1e14]">{word}</span>}
          <button onClick={onOpenProgress} className="ml-auto rounded-xl border-2 border-[#d9c49b] bg-white px-4 py-2 text-base font-semibold text-[#2c1e14] hover:bg-[#fdf6e8]">
            See progress →
          </button>
        </div>
      </Card>

      {remindersOpen && (
        <Drawer label="Reminders" onClose={() => setRemindersOpen(false)}>
          <RemindersPanel />
        </Drawer>
      )}
    </div>
  );
}

function Card({ title, lead, action, children }: { title: string; lead: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e6d3ae] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b563a]">{title}</h2>
        {action}
      </div>
      <p className="mt-1 text-lg text-[#2c1e14]">{lead}</p>
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}

/** Seven days, one line, no axis and no numbers. Gaps where there was no session. */
function Sparkline({ values, label }: { values: (number | null)[]; label: string }) {
  const W = 140;
  const H = 32;
  const x = (i: number) => (i / (values.length - 1)) * (W - 6) + 3;
  const y = (v: number) => (1 - v) * (H - 6) + 3;
  const d = values.reduce((acc, v, i) => (v === null ? acc : `${acc}${values[i - 1] == null ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)} `), "");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label}>
      <title>{label}</title>
      <path d={d} fill="none" stroke="#2c1e14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (v === null ? null : <circle key={i} cx={x(i)} cy={y(v)} r="2" fill="#2c1e14" />))}
    </svg>
  );
}
