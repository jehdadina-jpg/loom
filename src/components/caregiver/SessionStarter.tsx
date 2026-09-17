import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ACTIVITIES, getActivity, locationForActivity } from "../../data/activities";
import { PLACE_NAMES, PLACE_ORDER } from "../../data/places";
import { useTelemetry } from "../../game/telemetry/store";
import { useSession } from "../../game/session/SessionContext";
import { suggestActivity, type Suggestion } from "../../game/session/schedule";

const APP_CHOOSES = "__app__";

/**
 * The button and its sheet, on their own so the same control can sit in the console
 * header on every tab as well as on Today.
 */
export function StartSessionButton({ onHandOver, className }: { onHandOver: () => void; className: string }) {
  const { log } = useTelemetry();
  const { handOver } = useSession();
  const [sheetOpen, setSheetOpen] = useState(false);

  function start(activityId: string, chosenBy: "app" | "caregiver") {
    const sessionId = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    log({ type: "session_start", sessionId, activityId, chosenBy, timestamp: Date.now() });
    handOver({ sessionId, activityId, locationId: locationForActivity(activityId) });
    onHandOver();
  }

  return (
    <>
      <button onClick={() => setSheetOpen(true)} className={className}>
        Start a session
      </button>
      {sheetOpen && <StartSheet onClose={() => setSheetOpen(false)} onStart={start} />}
    </>
  );
}

function StartSheet({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (activityId: string, chosenBy: "app" | "caregiver") => void;
}) {
  const { events } = useTelemetry();
  const titleId = useId();
  const selectId = useId();
  const selectRef = useRef<HTMLSelectElement>(null);
  const [choice, setChoice] = useState(APP_CHOOSES);
  // worked out once when the sheet opens, so the pick doesn't shift while it's being read
  const [suggestion] = useState<Suggestion>(() => suggestActivity(events, new Date()));

  useEffect(() => selectRef.current?.focus(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const grouped = useMemo(
    () =>
      PLACE_ORDER.map((place) => ({
        place,
        activities: ACTIVITIES.filter((a) => locationForActivity(a.id) === place),
      })).filter((g) => g.activities.length > 0),
    [],
  );

  const appChooses = choice === APP_CHOOSES;
  const picked = appChooses ? suggestion.activity : getActivity(choice)!;
  const pickedPlace = PLACE_NAMES[locationForActivity(picked.id)];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[6px] border-t-4 border-[var(--ink-soft)] bg-[var(--parchment)] p-6 sm:rounded-[6px] sm:border-t-0 sm:border-2"
      >
        <h2 id={titleId} className="text-xl font-bold text-[var(--ink)]">
          Start a session
        </h2>

        <label htmlFor={selectId} className="mt-5 block text-base font-medium text-[var(--ink)]">
          Which activity
        </label>
        <select
          id={selectId}
          ref={selectRef}
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          className="mt-2 w-full rounded-[6px] border-2 border-[var(--ink-soft)] bg-[var(--parchment)] px-3 py-3 text-base text-[var(--ink)] focus:border-[var(--accent-shadow)] focus:outline-none"
        >
          <option value={APP_CHOOSES}>Let the app choose</option>
          {grouped.map((g) => (
            <optgroup key={g.place} label={PLACE_NAMES[g.place]}>
              {g.activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <div className="mt-4 rounded-[6px] bg-[var(--parchment)]/70 px-4 py-3" aria-live="polite">
          <p className="text-base text-[var(--ink)]">
            {picked.title} <span className="text-[var(--ink-soft)]">· {pickedPlace}</span>
          </p>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            {appChooses ? suggestion.reason : "Any activity can be started at any time of day."}
          </p>
        </div>

        <button
          onClick={() => onStart(picked.id, appChooses ? "app" : "caregiver")}
          className="mt-6 w-full rounded-[6px] bg-[var(--accent)] px-6 py-4 text-lg font-bold text-[var(--ink)] shadow-[0_4px_0_var(--accent-shadow)] transition hover:bg-[#e8b54a] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] active:translate-y-0.5 active:shadow-[0_2px_0_var(--accent-shadow)]"
        >
          Hand over the device
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full rounded-[6px] px-4 py-3 text-base text-[var(--ink-soft)] hover:bg-black/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
