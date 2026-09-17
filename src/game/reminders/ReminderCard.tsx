import { useEffect, useRef, useState } from "react";
import { useReminders } from "./ReminderContext";
import { CARD_FADE_MS, type Occurrence, type ReminderCategory } from "./model";
import { speechEngine } from "../speech/SpeechEngine";

const LEADS: Record<ReminderCategory, string> = {
  medicine: "Time for your medicine",
  hydration: "Time for a drink",
  activity: "It's time for",
  appointment: "Coming up",
};

const FADE_OUT_MS = 1200;

/**
 * A reminder on the patient side: one large card, one action. No snooze, no dismiss,
 * no counter. If nothing happens it simply fades — it never comes back to nag, and it
 * never says what was missed.
 */
export function ReminderCard({ textScale, reducedMotion }: { textScale: number; reducedMotion: boolean }) {
  const { patientCard, log, markShown, markFaded, markDone } = useReminders();
  if (!patientCard) return null;
  // keyed so each reminder gets its own fade clock
  return (
    <Card
      key={patientCard.key}
      occurrence={patientCard}
      shownAt={log.find((e) => e.type === "shown" && e.key === patientCard.key)?.timestamp ?? null}
      textScale={textScale}
      reducedMotion={reducedMotion}
      onShown={markShown}
      onFaded={markFaded}
      onDone={(o) => markDone(o, "patient")}
    />
  );
}

function Card({
  occurrence,
  shownAt,
  textScale,
  reducedMotion,
  onShown,
  onFaded,
  onDone,
}: {
  occurrence: Occurrence;
  shownAt: number | null;
  textScale: number;
  reducedMotion: boolean;
  onShown: (o: Occurrence) => void;
  onFaded: (o: Occurrence) => void;
  onDone: (o: Occurrence) => void;
}) {
  const { reminder } = occurrence;
  const [leaving, setLeaving] = useState(false);
  const spoken = useRef(false);

  useEffect(() => {
    onShown(occurrence);
    if (!spoken.current) {
      spoken.current = true;
      speechEngine.speak(`${LEADS[reminder.category]}. ${reminder.label}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occurrence.key]);

  // fade on the clock that started when it first appeared, so leaving the village and
  // coming back doesn't restart it
  useEffect(() => {
    const remaining = Math.max(0, (shownAt ?? Date.now()) + CARD_FADE_MS - Date.now());
    const fade = window.setTimeout(() => setLeaving(true), remaining);
    const gone = window.setTimeout(() => onFaded(occurrence), remaining + FADE_OUT_MS);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(gone);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occurrence.key, shownAt]);

  function done() {
    speechEngine.stop();
    onDone(occurrence);
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[55] flex items-end justify-center p-3 sm:p-6"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex max-h-full w-full max-w-md flex-col items-center gap-3 overflow-y-auto rounded-3xl p-5 text-center shadow-2xl sm:gap-4 sm:p-6 ${
          reducedMotion ? "" : "animate-toast-in"
        }`}
        style={{
          background: "linear-gradient(#fbf1da,#ecdcba)",
          border: "4px solid #4a2f1e",
          opacity: leaving ? 0 : 1,
          transition: `opacity ${reducedMotion ? 200 : FADE_OUT_MS}ms ease`,
        }}
      >
        {reminder.photo && (
          <img
            src={reminder.photo}
            alt=""
            className="max-h-[28vh] min-h-0 w-full shrink rounded-2xl object-contain"
            style={{ background: "rgba(120,85,45,0.12)" }}
          />
        )}
        <div>
          <p className="font-semibold text-[#6b563a]" style={{ fontSize: 20 * textScale }}>
            {LEADS[reminder.category]}
          </p>
          <p className="mt-1 font-bold leading-snug text-[#2c1e14]" style={{ fontSize: 28 * textScale }}>
            {reminder.label}
          </p>
        </div>
        <button
          onClick={done}
          className="w-full shrink-0 rounded-2xl px-6 py-3 font-bold sm:py-4 text-white shadow-[0_5px_0_#2a5a2b] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 active:translate-y-1 active:shadow-[0_2px_0_#2a5a2b]"
          style={{ background: "#3f7d40", fontSize: 26 * textScale }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
