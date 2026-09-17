import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useReminders } from "../../game/reminders/ReminderContext";
import { fileToPhotoDataUrl } from "../../game/photos/PhotoLibrary";
import {
  CATEGORIES,
  defaultEscalation,
  describeNext,
  describeSchedule,
  formatTime,
  nextOccurrence,
  occurrencesOn,
  occurrenceState,
  type Occurrence,
  type OccurrenceState,
  type Reminder,
  type ReminderCategory,
  type ReminderLogEntry,
} from "../../game/reminders/model";

const card = "rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-5  sm:p-6";
const primaryBtn =
  "rounded-[6px] bg-[var(--accent)] px-5 py-3 text-base font-bold text-[var(--ink)] shadow-[0_3px_0_var(--accent-shadow)] transition hover:bg-[#e8b54a] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] active:translate-y-0.5";
const quietBtn =
  "rounded-[6px] px-3 py-2 text-sm font-medium text-[var(--ink-soft)] underline underline-offset-2 hover:bg-black/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]";

function todays(reminders: Reminder[], log: ReminderLogEntry[], now: number) {
  const day = new Date(now);
  return reminders.flatMap((r) =>
    occurrencesOn(r, day).map((o) => ({ o, state: occurrenceState(o, log, now) })),
  );
}

/** The one plain sentence that leads a group — no counts, and nothing about how many were missed. */
function leadSentence(reminders: Reminder[], log: ReminderLogEntry[], now: number): string {
  if (reminders.length === 0) return "None set up yet.";
  const today = todays(reminders, log, now);
  if (today.length === 0) return "Nothing scheduled today.";
  const states = new Set(today.map((t) => t.state));
  if (states.has("due")) return "Something is waiting to be done.";
  const past = today.filter((t) => t.state !== "upcoming");
  if (past.length === 0) {
    const next = today.map((t) => t.o).sort((a, b) => a.scheduledFor - b.scheduledFor)[0];
    return `First one today at ${formatTime(next.scheduledFor)}.`;
  }
  if (states.has("missed")) return "Not everything was marked done today.";
  return states.has("upcoming") ? "All done so far today." : "All done for today.";
}

export function RemindersPanel() {
  const { reminders, log, now, notifications, requestNotifications, storageError } = useReminders();
  const [editing, setEditing] = useState<Reminder | "new" | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--ink)]">Reminders</h1>
          <p className="mt-1 text-lg text-[var(--ink)]">{leadSentence(reminders, log, now)}</p>
        </div>
        <button onClick={() => setEditing("new")} className={primaryBtn}>
          Add a reminder
        </button>
      </header>

      <NotificationLine status={notifications} onEnable={requestNotifications} />
      {storageError && <p className="mb-4 text-base text-[var(--ink-soft)]">{storageError}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CATEGORIES.map((c) => {
          const inCategory = reminders.filter((r) => r.category === c.id);
          return (
            <section key={c.id} className={card}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{c.label}</h2>
              <p className="mt-1 text-lg text-[var(--ink)]">{leadSentence(inCategory, log, now)}</p>
              {inCategory.length > 0 && (
                <ul className="mt-3 divide-y divide-[var(--parchment2)]">
                  {inCategory.map((r) => (
                    <ReminderRow key={r.id} reminder={r} onEdit={() => setEditing(r)} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {editing && (
        <ReminderForm initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function NotificationLine({ status, onEnable }: { status: string; onEnable: () => void }) {
  const text =
    status === "granted"
      ? "This device will be notified when a reminder gets no response for 30 minutes."
      : status === "denied"
        ? "Notifications are blocked for this site in the browser settings, so no-response alerts only show on this page."
        : status === "unsupported"
          ? "This browser can't show notifications, so no-response alerts only show on this page."
          : "Turn on notifications so this device hears about reminders that get no response.";
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] px-5 py-3">
      <p className="flex-1 text-base text-[var(--ink)]">{text}</p>
      {status === "default" && (
        <button onClick={onEnable} className={primaryBtn}>
          Turn on notifications
        </button>
      )}
    </div>
  );
}

const STATE_STYLE: Record<OccurrenceState, { mark: string; word: string; cls: string }> = {
  done: { mark: "✓", word: "done", cls: "bg-[#e3f0dd] text-[#2f5e30]" },
  due: { mark: "⋯", word: "due", cls: "bg-[#e2eef3] text-[#2c4f5e]" },
  // neutral on purpose: no red, no exclamation
  missed: { mark: "●", word: "missed", cls: "bg-[#efebe4] text-[#5f574c]" },
  upcoming: { mark: "", word: "", cls: "bg-transparent text-[var(--ink-soft)]" },
};

function ReminderRow({ reminder, onEdit }: { reminder: Reminder; onEdit: () => void }) {
  const { log, now, markDone } = useReminders();
  const today = occurrencesOn(reminder, new Date(now));
  const next = nextOccurrence(reminder, new Date(now));

  return (
    <li className="flex gap-3 py-4">
      {reminder.photo && (
        <img src={reminder.photo} alt="" className="h-14 w-14 shrink-0 rounded-[6px] border-2 border-[var(--parchment2)] object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-lg font-semibold text-[var(--ink)]">{reminder.label}</p>
          <button onClick={onEdit} className={quietBtn}>
            Edit
          </button>
        </div>
        <p className="text-base text-[var(--ink-soft)]">{describeSchedule(reminder.schedule)}</p>
        <p className="text-base text-[var(--ink-soft)]">Next: {describeNext(next, new Date(now))}</p>
        {today.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Today">
            {today.map((o) => (
              <OccurrenceChip key={o.key} occurrence={o} state={occurrenceState(o, log, now)} log={log} onMarkDone={markDone} />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function OccurrenceChip({
  occurrence,
  state,
  log,
  onMarkDone,
}: {
  occurrence: Occurrence;
  state: OccurrenceState;
  log: ReminderLogEntry[];
  onMarkDone: (o: Occurrence, by: "caregiver") => void;
}) {
  const s = STATE_STYLE[state];
  const escalated = state === "due" && log.some((e) => e.type === "escalated" && e.key === occurrence.key);
  return (
    <li className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${s.cls}`}>
      <span className="font-medium">{formatTime(occurrence.scheduledFor)}</span>
      {state !== "upcoming" && (
        <span>
          <span aria-hidden>{s.mark} </span>
          {escalated ? "due · no response yet" : s.word}
        </span>
      )}
      {(state === "due" || state === "missed") && (
        <button
          onClick={() => onMarkDone(occurrence, "caregiver")}
          className="rounded-full bg-[var(--parchment)]/80 px-2 py-0.5 text-sm font-medium underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
        >
          Mark done
        </button>
      )}
    </li>
  );
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LABEL_EXAMPLES: Record<ReminderCategory, string> = {
  medicine: "e.g. the white tablet, or Bikash's blood pressure medicine",
  hydration: "e.g. a glass of water",
  activity: "e.g. a walk to the gate",
  appointment: "e.g. clinic visit with Dr. Rai",
};

function ReminderForm({ initial, onClose }: { initial: Reminder | null; onClose: () => void }) {
  const { saveReminder, removeReminder } = useReminders();
  const titleId = useId();
  const labelId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<ReminderCategory>(initial?.category ?? "medicine");
  const [label, setLabel] = useState(initial?.label ?? "");
  // the appointment-only "once" schedule has no editor here; editing one falls back to daily
  const [kind, setKind] = useState<"daily" | "weekly">(initial?.schedule.kind === "weekly" ? "weekly" : "daily");
  const [times, setTimes] = useState<string[]>(initial?.schedule.kind === "daily" ? initial.schedule.times : ["08:00"]);
  const [days, setDays] = useState<number[]>(initial?.schedule.kind === "weekly" ? initial.schedule.days : [1]);
  const [weeklyTime, setWeeklyTime] = useState(initial?.schedule.kind === "weekly" ? initial.schedule.time : "10:00");
  const [photo, setPhoto] = useState<string | null>(initial?.photo ?? null);
  const [escalate, setEscalate] = useState(initial?.escalate ?? defaultEscalation("medicine"));
  const [escalateTouched, setEscalateTouched] = useState(!!initial);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pickCategory(c: ReminderCategory) {
    setCategory(c);
    if (!escalateTouched) setEscalate(defaultEscalation(c));
  }

  async function pickPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      setPhoto(await fileToPhotoDataUrl(file));
      setProblem(null);
    } catch {
      setProblem("That picture couldn't be read. Try a JPEG or PNG.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const cleanTimes = useMemo(() => [...new Set(times.filter(Boolean))].sort(), [times]);

  function save() {
    if (!label.trim()) return setProblem("Add a label in your own words.");
    if (kind === "daily" && cleanTimes.length === 0) return setProblem("Add at least one time.");
    if (kind === "weekly" && (days.length === 0 || !weeklyTime)) return setProblem("Pick at least one day and a time.");
    saveReminder({
      id: initial?.id,
      category,
      label: label.trim(),
      schedule: kind === "daily" ? { kind, times: cleanTimes } : { kind, days: [...days].sort(), time: weeklyTime },
      photo,
      escalate,
    });
    onClose();
  }

  const field = "mt-2 w-full rounded-[6px] border-2 border-[var(--ink-soft)] bg-[var(--parchment)] px-3 py-2.5 text-base text-[var(--ink)] focus:border-[var(--accent-shadow)] focus:outline-none";
  const toggle = (on: boolean) =>
    `rounded-[6px] border-2 px-3 py-2 text-base font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] ${
      on ? "border-[var(--accent-shadow)] bg-[#f6e3b8] text-[var(--ink)]" : "border-[var(--parchment2)] bg-[var(--parchment)] text-[var(--ink-soft)]"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[6px] border-t-4 border-[var(--ink-soft)] bg-[var(--parchment)] p-6 sm:rounded-[6px] sm:border-t-0 sm:border-2"
      >
        <h2 id={titleId} className="text-xl font-bold text-[var(--ink)]">
          {initial ? "Edit reminder" : "Add a reminder"}
        </h2>

        <fieldset className="mt-5">
          <legend className="text-base font-medium text-[var(--ink)]">What kind</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => pickCategory(c.id)} className={toggle(category === c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label htmlFor={labelId} className="mt-5 block text-base font-medium text-[var(--ink)]">
          Label, in your own words
        </label>
        <input
          id={labelId}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={LABEL_EXAMPLES[category]}
          className={field}
          autoFocus
        />

        <fieldset className="mt-5">
          <legend className="text-base font-medium text-[var(--ink)]">When</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={kind === "daily"} onClick={() => setKind("daily")} className={toggle(kind === "daily")}>
              Times each day
            </button>
            <button type="button" aria-pressed={kind === "weekly"} onClick={() => setKind("weekly")} className={toggle(kind === "weekly")}>
              Certain days
            </button>
          </div>

          {kind === "daily" ? (
            <div className="mt-3 space-y-2">
              {times.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`Time ${i + 1}`}
                    value={t}
                    onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))}
                    className={`${field} mt-0`}
                  />
                  {times.length > 1 && (
                    <button type="button" onClick={() => setTimes(times.filter((_, j) => j !== i))} className={quietBtn}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setTimes([...times, "20:00"])} className={quietBtn}>
                Add another time
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={days.includes(i)}
                    onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])}
                    className={toggle(days.includes(i))}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <input type="time" aria-label="Time" value={weeklyTime} onChange={(e) => setWeeklyTime(e.target.value)} className={field} />
            </div>
          )}
        </fieldset>

        <div className="mt-5">
          <p className="text-base font-medium text-[var(--ink)]">Photo (optional)</p>
          <p className="text-sm text-[var(--ink-soft)]">A picture of the actual pill strip, bottle or clinic card helps most.</p>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void pickPhoto(e.target.files)} />
          {photo ? (
            <div className="mt-2 flex items-center gap-3">
              <img src={photo} alt="Reminder photo" className="h-20 w-20 rounded-[6px] border-2 border-[var(--parchment2)] object-cover" />
              <button type="button" onClick={() => fileRef.current?.click()} className={quietBtn}>
                Change
              </button>
              <button type="button" onClick={() => setPhoto(null)} className={quietBtn}>
                Remove
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className={`${quietBtn} mt-1`}>
              Add a photo
            </button>
          )}
        </div>

        <label className="mt-5 flex items-start gap-3 text-base text-[var(--ink)]">
          <input
            type="checkbox"
            checked={escalate}
            onChange={(e) => {
              setEscalate(e.target.checked);
              setEscalateTouched(true);
            }}
            className="mt-1 h-5 w-5 accent-[var(--accent-shadow)]"
          />
          <span>Notify this device if there's no response within 30 minutes</span>
        </label>

        {problem && <p className="mt-4 text-base text-[var(--ink-soft)]">{problem}</p>}

        <button type="button" onClick={save} className={`${primaryBtn} mt-6 w-full py-4 text-lg`}>
          {initial ? "Save changes" : "Add reminder"}
        </button>
        <div className="mt-2 flex justify-between">
          <button type="button" onClick={onClose} className={quietBtn}>
            Cancel
          </button>
          {initial &&
            (confirmRemove ? (
              <button
                type="button"
                onClick={() => {
                  removeReminder(initial.id);
                  onClose();
                }}
                className={quietBtn}
              >
                Yes, remove it
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmRemove(true)} className={quietBtn}>
                Remove reminder
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
