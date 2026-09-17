/**
 * "WHAT SHE CAN STILL DO" — first on the Today tab, above today's session. That ordering
 * is the product statement: every dementia product shows decline, this one leads with what
 * is preserved. See src/game/today/preserved.ts for how each line is derived and why.
 */
import { useMemo, useState } from "react";
import { useTelemetry } from "../../game/telemetry/store";
import { useAlerts } from "../../game/alerts/AlertsContext";
import { useProfile } from "../../game/profiles/ProfileContext";
import { personWords } from "../../game/profiles/words";
import { useSession } from "../../game/session/SessionContext";
import { usePhotos } from "../../game/photos/PhotoLibrary";
import { useSettings } from "../../game/state/SettingsContext";
import { derivePreserved, preservedShareText } from "../../game/today/preserved";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function PreservedPanel() {
  const { events } = useTelemetry();
  const { trajectory } = useAlerts();
  const { active } = useProfile();
  const { memories } = useSession();
  const { photos } = usePhotos();
  const { settings } = useSettings();
  const [note, setNote] = useState<string | null>(null);
  const w = personWords(active.person);

  const items = useMemo(() => {
    const comfortVisits = events.filter((e) => e.type === "comfort").length;
    return derivePreserved(
      events,
      trajectory,
      { photos, memories, familyVoiceLabel: settings.familyVoiceLabel, comfortVisits },
      w,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, trajectory, photos, memories, settings.familyVoiceLabel]);

  async function share() {
    const text = preservedShareText(items, w);
    const nav = navigator as Navigator & { share?: (data: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: `What ${cap(w.name)} can still do`, text });
        return;
      } catch {
        // cancelled or unavailable — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setNote("Copied. Paste it into a message to the family.");
    } catch {
      setNote("Sharing isn't available here.");
    }
  }

  const [lead, ...rest] = items;

  return (
    <section className="woven-border rounded-[6px] bg-[var(--parchment)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
          What {w.subject === w.name ? cap(w.name) : w.subject} can still do
        </h2>
        <button
          onClick={() => void share()}
          className="rounded-[6px] border-2 border-[var(--ink-soft)] bg-[var(--parchment)] px-3 py-1 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--parchment2)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        >
          Share
        </button>
      </div>

      <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{lead.text}</p>

      {rest.length > 0 && (
        <ul className="mt-3 space-y-2">
          {rest.map((i) => (
            <li key={i.id} className="flex items-start gap-2 text-base text-[var(--ink)]">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--good)]" />
              <span>{i.text}</span>
            </li>
          ))}
        </ul>
      )}

      {note && (
        <p className="mt-3 text-base text-[var(--ink-soft)]" role="status">
          {note}
        </p>
      )}
    </section>
  );
}
