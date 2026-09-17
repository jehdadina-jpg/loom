/**
 * THE HANDOVER CARD — one printable page for whoever takes over for a day: a sibling
 * visiting, a new attendant, a respite carer. Works with no login: someone hands over a
 * piece of paper, or pastes the copied text into WhatsApp, which is how this actually gets
 * shared. See src/game/handover/handover.ts for how each generated line is derived.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTelemetry } from "../../game/telemetry/store";
import { useAlerts } from "../../game/alerts/AlertsContext";
import { useProfile } from "../../game/profiles/ProfileContext";
import { personWords } from "../../game/profiles/words";
import { useSession } from "../../game/session/SessionContext";
import { usePhotos } from "../../game/photos/PhotoLibrary";
import { useSettings } from "../../game/state/SettingsContext";
import { useReminders } from "../../game/reminders/ReminderContext";
import { usePersistentState } from "../../game/state/usePersistentState";
import { readRecordEvents } from "../../health-worker/boundary";
import { derivePreserved } from "../../game/today/preserved";
import { computeVaultReading } from "../../game/vault/engagement";
import { computeRhythm } from "../../game/rhythm/rhythm";
import {
  DEFAULT_AVOID,
  HANDOVER_AVOID_KEY,
  HANDOVER_NOTE_KEY,
  HANDOVER_PEOPLE_KEY,
  HANDOVER_UPSET_KEY,
  bestTimesText,
  handoverShareText,
  medicineLines,
  respondsToLines,
  seedIfUpset,
  type HandoverDraft,
} from "../../game/handover/handover";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const PRINT_CSS = `
.handover-print { display: none; }
@media print {
  .handover-print { display: block !important; }
  .handover-print h1 { font-size: 22px; margin: 0 0 10px; }
  .handover-print h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .03em; margin: 10px 0 2px; padding-bottom: 2px; border-bottom: 1px solid #cbb98c; color: #6b5d4a; }
  .handover-print p, .handover-print li { font-size: 14px; line-height: 1.4; margin: 0; color: #2e2318; }
  .handover-print ul { margin: 0; padding-left: 18px; }
  .handover-print .cols { display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; }
  @page { size: A4; margin: 12mm; }
}
`;

const btn =
  "rounded-[6px] border-2 border-[var(--ink-soft)] bg-[var(--parchment)] px-4 py-2 text-base font-semibold text-[var(--ink)] hover:bg-[var(--parchment2)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]";
const fieldClass =
  "w-full rounded-[6px] border-2 border-[var(--parchment2)] bg-[#fffdf8] p-2 text-base text-[var(--ink)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]";

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

export function HandoverCard({ onClose }: { onClose: () => void }) {
  const { events } = useTelemetry();
  const { trajectory } = useAlerts();
  const { active, activeId } = useProfile();
  const { memories } = useSession();
  const { photos } = usePhotos();
  const { settings } = useSettings();
  const { reminders } = useReminders();
  const [note, setNote] = useState<string | null>(null);
  const w = personWords(active.person);
  const name = cap(w.name);

  const [avoidText, setAvoidText] = usePersistentState<string>(HANDOVER_AVOID_KEY, DEFAULT_AVOID);
  const [peopleText, setPeopleText] = usePersistentState<string>(HANDOVER_PEOPLE_KEY, "");
  const [oneThing, setOneThing] = usePersistentState<string>(HANDOVER_NOTE_KEY, "");
  const [ifUpsetSaved, setIfUpsetSaved] = usePersistentState<string | null>(HANDOVER_UPSET_KEY, null);

  const preserved = useMemo(() => {
    const comfortVisits = events.filter((e) => e.type === "comfort").length;
    return derivePreserved(events, trajectory, { photos, memories, familyVoiceLabel: settings.familyVoiceLabel, comfortVisits }, w);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, trajectory, photos, memories, settings.familyVoiceLabel]);

  const vault = useMemo(
    () => computeVaultReading(events, photos, Boolean(settings.familyVoiceUrl)),
    [events, photos, settings.familyVoiceUrl],
  );
  const rhythm = useMemo(() => computeRhythm(readRecordEvents(localStorage, activeId)), [activeId, events]);
  const ifUpsetSeed = useMemo(() => seedIfUpset(vault), [vault]);
  const ifUpset = ifUpsetSaved ?? ifUpsetSeed;

  useEffect(() => {
    document.body.classList.add("printing-handover");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("printing-handover");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const draft: HandoverDraft = {
    bestTimes: bestTimesText(rhythm),
    respondsTo: respondsToLines(preserved, vault),
    avoid: lines(avoidText),
    people: lines(peopleText),
    ifUpset,
    medicines: medicineLines(reminders),
    oneThing,
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(handoverShareText(name, draft));
      setNote("Copied. Paste it into a WhatsApp message.");
    } catch {
      setNote("Copying isn't allowed here.");
    }
  }

  return createPortal(
    <div className="theme-care handover-print-root fixed inset-0 z-[80] overflow-y-auto bg-[var(--parchment2)]" role="dialog" aria-modal="true" aria-label="Handover card">
      <style>{PRINT_CSS}</style>

      <div className="no-print sticky top-0 z-10 border-b-2 border-[var(--ink-soft)] bg-[var(--parchment)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
          <p className="mr-auto text-base text-[var(--ink)]">Fill this in, then print it or copy it — whoever takes over doesn't need to log in.</p>
          <button onClick={() => window.print()} className={btn}>
            Print
          </button>
          <button onClick={() => void copy()} className={btn}>
            Copy as text
          </button>
          <button onClick={onClose} className={btn}>
            Close
          </button>
        </div>
        {note && (
          <p className="mx-auto max-w-3xl px-4 pb-3 text-base text-[var(--ink)]" role="status">
            {note}
          </p>
        )}
      </div>

      {/* PRINT-ONLY: a clean static rendering of the current draft — never the empty boxes. */}
      <div className="handover-print bg-white p-2">
        <h1>Looking after {name} — what helps</h1>
        <div className="cols">
          <div>
            <PrintSection title="Best times">
              <p>{draft.bestTimes}</p>
            </PrintSection>
            <PrintSection title="She responds to">
              <PrintList items={draft.respondsTo} empty="Still learning." />
            </PrintSection>
            <PrintSection title="Avoid">
              <PrintList items={draft.avoid} empty="Nothing noted yet." />
            </PrintSection>
            <PrintSection title="Her people">
              <PrintList items={draft.people} empty="Not filled in yet." />
            </PrintSection>
          </div>
          <div>
            <PrintSection title="If she's upset">
              <p>{draft.ifUpset || "Not filled in yet."}</p>
            </PrintSection>
            <PrintSection title="Medicines">
              <PrintList items={draft.medicines} empty="No medicine reminders set in LOOM." />
            </PrintSection>
            <PrintSection title="One thing to know">
              <p>{draft.oneThing || "Not filled in yet."}</p>
            </PrintSection>
          </div>
        </div>
      </div>

      {/* EDIT VIEW — on screen only. */}
      <div className="no-print mx-auto max-w-3xl space-y-4 px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-semibold text-[var(--ink)]">Looking after {name} — what helps</h1>

        <EditSection title="Best times" hint="From the time-of-day map. Not editable — it updates as more sessions happen.">
          <p className={`${fieldClass} bg-[var(--parchment2)]`}>{draft.bestTimes}</p>
        </EditSection>

        <EditSection title="She responds to" hint="From what she can still do, and from the vault engagement panel.">
          <p className={`${fieldClass} bg-[var(--parchment2)] whitespace-pre-line`}>{draft.respondsTo.join("\n") || "Still learning."}</p>
        </EditSection>

        <EditSection title="Avoid" hint="One per line. Start from these, change them to fit her.">
          <textarea className={fieldClass} rows={3} value={avoidText} onChange={(e) => setAvoidText(e.target.value)} />
        </EditSection>

        <EditSection title="Her people" hint="One per line, in your own words — name, relationship, when they usually visit.">
          <textarea
            className={fieldClass}
            rows={3}
            placeholder={"e.g. Rimi — daughter, most Sundays\nBimal — son, calls most evenings"}
            value={peopleText}
            onChange={(e) => setPeopleText(e.target.value)}
          />
        </EditSection>

        <EditSection title="If she's upset" hint="Seeded with what the data shows calms her. Change it if you know better.">
          <textarea className={fieldClass} rows={2} value={ifUpset} onChange={(e) => setIfUpsetSaved(e.target.value)} />
        </EditSection>

        <EditSection title="Medicines" hint="From the reminders panel. Add or change reminders there to update this.">
          <p className={`${fieldClass} bg-[var(--parchment2)] whitespace-pre-line`}>{draft.medicines.join("\n")}</p>
        </EditSection>

        <EditSection title="One thing to know" hint="Whatever matters most today — a mood, a visitor, anything unusual.">
          <textarea
            className={fieldClass}
            rows={2}
            placeholder="e.g. She had a rough night, go gently this morning."
            value={oneThing}
            onChange={(e) => setOneThing(e.target.value)}
          />
        </EditSection>
      </div>
    </div>,
    document.body,
  );
}

function EditSection({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{title}</h2>
      <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{hint}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function PrintSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function PrintList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p>{empty}</p>;
  return (
    <ul>
      {items.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  );
}
