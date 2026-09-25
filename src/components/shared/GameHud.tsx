import { useMemo } from "react";
import { GUIDE_PLAN } from "../../game/session/SessionContext";
import { useSession } from "../../game/session/SessionContext";
import { useTelemetry } from "../../game/telemetry/store";

export function GameHud({ onSettings, textScale = 1 }: { onSettings: () => void; textScale?: number }) {
  const session = useSession();
  const { events } = useTelemetry();
  const completed = session.guideIndex;
  const recentStruggle = events.some((event) => event.type === "activity_attempt" && !event.correct && Date.now() - event.timestamp < 4500);
  const warmth = Math.min(1, 0.35 + completed * 0.08 + (recentStruggle ? -0.06 : 0));
  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const dayLabel = today.toLocaleDateString(undefined, { weekday: "long" });
  const tasks = useMemo(() => GUIDE_PLAN.slice(0, 5), []);

  return (
    <div className="loom-hud" style={{ "--loom-text-scale": textScale } as React.CSSProperties}>
      <section className="loom-hud__tasks" aria-label="Today's gentle plan">
        <div className="loom-hud__panel-title"><span aria-hidden="true">✿</span> Today together</div>
        {tasks.map((task, index) => {
          const done = index < completed;
          return (
            <div className={`loom-hud__task ${done ? "is-done" : ""}`} key={`${task.locationId}-${task.hotspotId}`}>
              <span className="loom-hud__check" aria-hidden="true">{done ? "✓" : ""}</span>
              <span>{task.prompt.replace(/[.!?]$/, "")}</span>
            </div>
          );
        })}
      </section>

      <div className="loom-hud__date" aria-label={`${dayLabel}, ${dateLabel}`}>
        <span className="loom-hud__date-day">{dayLabel}</span>
        <span>{dateLabel}</span>
      </div>

      <div className="loom-hud__comfort" title="A little warmth for the journey" aria-label="Comfort light">
        <span className="loom-hud__lantern" style={{ opacity: warmth }} aria-hidden="true">☼</span>
        <span className="loom-hud__comfort-label">Warmth</span>
      </div>

      <button className="loom-hud__settings" type="button" onClick={onSettings} aria-label="Open settings and caretaker dashboard" title="Settings">
        ⚙
      </button>
    </div>
  );
}