/**
 * "How did that feel?" — once per session, on the caregiver's own device, always
 * skippable. This is the caregiver's own read, kept separate from anything measured, and
 * never asked twice for the same session (see src/game/mood/mood.ts).
 */
import { useMemo } from "react";
import { useTelemetry } from "../../game/telemetry/store";
import { sessionRecords } from "../../game/session/history";
import { usePersistentState } from "../../game/state/usePersistentState";
import { MOOD_KEY, EMPTY_MOOD, sessionToAskAbout, type MoodRead, type MoodState } from "../../game/mood/mood";

const CHOICES: { read: MoodRead; icon: string; label: string }[] = [
  { read: "easier", icon: "🙂", label: "Easier than usual" },
  { read: "same", icon: "😐", label: "About the same" },
  { read: "harder", icon: "😟", label: "Harder" },
];

export function MoodPrompt() {
  const { events } = useTelemetry();
  const [mood, setMood] = usePersistentState<MoodState>(MOOD_KEY, EMPTY_MOOD);
  const records = useMemo(() => sessionRecords(events), [events]);
  const target = sessionToAskAbout(records, mood, Date.now());

  if (!target) return null;

  function answer(read: MoodRead) {
    setMood((s) => ({ ...s, entries: [...s.entries, { sessionId: target!.sessionId, at: Date.now(), read }] }));
  }
  function skip() {
    setMood((s) => ({ ...s, skippedSessionIds: [...s.skippedSessionIds, target!.sessionId] }));
  }

  return (
    <section className="rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-4 sm:p-5" role="status">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-semibold text-[var(--ink)]">How did that feel?</p>
        <button onClick={skip} className="rounded-[6px] px-2 py-1 text-sm font-medium text-[var(--ink-soft)] underline underline-offset-2 hover:bg-black/5">
          Skip
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHOICES.map((c) => (
          <button
            key={c.read}
            onClick={() => answer(c.read)}
            className="flex items-center gap-2 rounded-[6px] border-2 border-[var(--ink-soft)] bg-[var(--parchment)] px-4 py-2.5 text-base font-medium text-[var(--ink)] hover:bg-[var(--parchment2)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
          >
            <span aria-hidden className="text-xl">
              {c.icon}
            </span>
            {c.label}
          </button>
        ))}
      </div>
    </section>
  );
}
