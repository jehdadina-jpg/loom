/**
 * THINGS TO TALK ABOUT — the panel that tells the caregiver what to say, not what to test.
 * Every line names something real from the session log. Opened daily, most likely, which is
 * what gets the rest of the dashboard seen.
 */
import { useMemo } from "react";
import { useTelemetry } from "../../game/telemetry/store";
import { useReminders } from "../../game/reminders/ReminderContext";
import { sessionRecords } from "../../game/session/history";
import { talkAbout } from "../../game/today/talk";

export function TalkAboutPanel() {
  const { events } = useTelemetry();
  const { now } = useReminders();
  const records = useMemo(() => sessionRecords(events), [events]);
  const prompts = useMemo(() => talkAbout(records, events, now), [records, events, now]);

  return (
    <section className="rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-5 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Things to talk about</h2>
      {prompts.length === 0 ? (
        <>
          <p className="mt-1 text-lg text-[var(--ink)]">Nothing specific yet.</p>
          <p className="mt-2 text-base text-[var(--ink-soft)]">After a session or two, this fills in with things to ask her about — real places, real people, real things she did.</p>
        </>
      ) : (
        <ul className="mt-3 space-y-3">
          {prompts.map((p) => (
            <li key={p.id} className="text-lg leading-snug text-[var(--ink)]">
              {p.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
