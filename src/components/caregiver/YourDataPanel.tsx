import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useProfile } from "../../game/profiles/ProfileContext";
import { useTelemetry } from "../../game/telemetry/store";
import { useSession } from "../../game/session/SessionContext";
import { usePhotos } from "../../game/photos/PhotoLibrary";
import { useSettings } from "../../game/state/SettingsContext";
import { useReminders } from "../../game/reminders/ReminderContext";
import { useAlerts } from "../../game/alerts/AlertsContext";
import { usePersistentState } from "../../game/state/usePersistentState";
import { RUDAS_KEY, type RudasRecord } from "../../game/clinical/rudas";
import { WELLBEING_KEY, type WellbeingState } from "../../game/wellbeing/checkin";
import { readRecordEvents } from "../../health-worker/boundary";
import { eraseEverything, readAll } from "../../game/data/yourData";
import { flushQueue } from "../../game/sync/queue";
import { useSyncStatus } from "../../game/sync/useSyncStatus";
import { demoInstalled, installDemo, removeDemo } from "../../game/demo/installDemo";
import { DEMO_PERSON_NAME, DEMO_PROFILE_ID } from "../../game/demo/demoData";
import { ARCHIVE_CSS, ArchiveDocument } from "./ArchiveDocument";
import { field, Page, primaryBtn, secondaryBtn, Section } from "../shared/ui";

const COLLECTED: { what: string; examples: string; where: string; who: string }[] = [
  {
    what: "About the person",
    examples: "Name, year of birth, how to refer to them, the household name, your notes.",
    where: "This device.",
    who: "Your family. A health worker sees only the name and age.",
  },
  {
    what: "Activities and sessions",
    examples: "Which activities were played, how much help each needed, how long they took, when sessions started and ended.",
    where: "This device. The help needed, the time taken and session times are also sent to the health-worker sync server.",
    who: "Your family sees everything. A health worker sees the trend and session times — never which activity or what was chosen.",
  },
  {
    what: "Memory Vault",
    examples: "Family photos, the family voice note, album moments.",
    where: "This device only. Never uploaded.",
    who: "Your family only.",
  },
  {
    what: "Reminders",
    examples: "Your labels and photos, the times, when each was marked done.",
    where: "This device. Only the kind of reminder and how long a response took are sent to the sync server.",
    who: "Your family. A health worker never sees your labels or photos.",
  },
  {
    what: "RUDAS check-ups",
    examples: "Item scores, the total, the date and who gave it.",
    where: "This device and the health-worker sync server.",
    who: "Your family and the health worker.",
  },
  {
    what: "Alerts, settings and your own check-ins",
    examples: "Alerts raised and handled, display and adaptive settings, your weekly answers.",
    where: "This device only.",
    who: "Your family only. Your check-ins are for you.",
  },
];

function download(name: string, html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function ago(t: number | null): string {
  if (!t) return "never";
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function YourDataPanel({ onShowHealthWorkerView }: { onShowHealthWorkerView: () => void }) {
  const { active, activeId } = useProfile();
  const { events } = useTelemetry();
  const { memories } = useSession();
  const { photos } = usePhotos();
  const { settings } = useSettings();
  const { reminders, log: reminderLog } = useReminders();
  const { open, handled } = useAlerts();
  const [rudas] = usePersistentState<RudasRecord[]>(RUDAS_KEY, []);
  const [wellbeing] = usePersistentState<WellbeingState>(WELLBEING_KEY, { checkins: [], skippedWeeks: [], noticesSeen: [] });
  const sync = useSyncStatus();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [exported, setExported] = useState(false);
  const [demoIsInstalled] = useState(demoInstalled);
  const who = active.person?.fullName.trim() || active.name;

  function exportEverything() {
    const exportedAt = Date.now();
    const body = renderToStaticMarkup(
      <ArchiveDocument
        data={{
          profile: active,
          events,
          record: readRecordEvents(localStorage, activeId),
          memories,
          photos,
          voice: { url: settings.familyVoiceUrl, label: settings.familyVoiceLabel },
          reminders,
          reminderLog,
          rudas,
          wellbeing,
          alerts: [...open, ...handled],
          raw: readAll(activeId),
          exportedAt,
        }}
      />,
    );
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LOOM — everything for ${who.replace(/</g, "&lt;")}</title><style>${ARCHIVE_CSS}</style></head><body>${body}</body></html>`;
    download(`loom-everything-${who.replace(/\s+/g, "-").toLowerCase()}-${new Date(exportedAt).toISOString().slice(0, 10)}.html`, html);
    setExported(true);
  }

  const syncLead = !sync.online
    ? `Offline. ${sync.pending === 0 ? "Nothing is waiting" : `${sync.pending} change${sync.pending === 1 ? " is" : "s are"} waiting`} to upload when the connection returns.`
    : sync.pending === 0
      ? "Everything is uploaded."
      : `${sync.pending} change${sync.pending === 1 ? " is" : "s are"} waiting to upload.`;

  return (
    <Page title="Your data" lead={`Everything LOOM keeps about ${who} is on this page — to take away, or to remove.`}>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Sync" lead={syncLead}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
            <dt className="text-[var(--ink-soft)]">Waiting to upload</dt>
            <dd className="text-[var(--ink)]" aria-live="polite">{sync.pending}</dd>
            <dt className="text-[var(--ink-soft)]">Last successful sync</dt>
            <dd className="text-[var(--ink)]">{ago(sync.lastSuccessAt)}</dd>
            <dt className="text-[var(--ink-soft)]">Connection</dt>
            <dd className="text-[var(--ink)]">{sync.online ? "Online" : "Offline"}</dd>
          </dl>
          {sync.lastProblem && sync.pending > 0 && <p className="mt-2 text-base text-[var(--ink-soft)]">{sync.lastProblem}</p>}
          <button onClick={() => void flushQueue()} disabled={!sync.online || sync.pending === 0} className={`${secondaryBtn} mt-4`}>
            Sync now
          </button>
        </Section>

        <Section title="Export everything" lead="One file with every record, photo and voice note, readable in any web browser.">
          <button onClick={exportEverything} className={primaryBtn}>
            Export everything
          </button>
          {exported && <p className="mt-2 text-base text-[var(--ink)]" role="status">Saved to your downloads.</p>}
        </Section>
      </div>

      <div className="mt-4">
        <Section title="What is collected" lead="In plain words: what LOOM keeps, where it lives, and who can see it.">
          <ul className="divide-y divide-[var(--parchment2)]">
            {COLLECTED.map((c) => (
              <li key={c.what} className="py-3 text-base text-[var(--ink)]">
                <p className="font-semibold">{c.what}</p>
                <p className="text-[var(--ink-soft)]">{c.examples}</p>
                <p><span className="text-[var(--ink-soft)]">Stored: </span>{c.where}</p>
                <p><span className="text-[var(--ink-soft)]">Seen by: </span>{c.who}</p>
              </li>
            ))}
          </ul>
          <button onClick={onShowHealthWorkerView} className={`${secondaryBtn} mt-3`}>
            See exactly what a health worker can see
          </button>
        </Section>
      </div>

      <div className="mt-4">
        <Section
          title="Demonstration data"
          lead="An invented family with two months of history behind them, for showing what this looks like in use. They are kept separate from every real record here, and can be removed again."
        >
          {demoIsInstalled ? (
            <>
              <p className="text-base text-[var(--ink)]">
                {activeId === DEMO_PROFILE_ID
                  ? `${DEMO_PERSON_NAME} is loaded, and is the person you are looking at now. Switch people to get back to your own records.`
                  : `${DEMO_PERSON_NAME} is loaded, and sits alongside ${who} in the list of people.`}
              </p>
              <button
                onClick={() => {
                  removeDemo();
                  window.location.reload();
                }}
                className={`${secondaryBtn} mt-3`}
              >
                Remove the demonstration person
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                installDemo();
                window.location.reload();
              }}
              className={secondaryBtn}
            >
              Load the demonstration person
            </button>
          )}
        </Section>
      </div>

      <div className="mt-4">
        <Section title="Delete everything" lead={`Removes every record for ${who} from this device, and asks the sync server to remove its copy too.`}>
          {!confirming ? (
            <button onClick={() => setConfirming(true)} className={secondaryBtn}>
              Delete everything…
            </button>
          ) : (
            <div className="rounded-[6px] border-2 border-[var(--ink)] bg-[var(--parchment)] p-4">
              <p className="text-base text-[var(--ink)]">
                This removes sessions, the activity record, RUDAS results, reminders, alerts, check-ins, settings, family photos,
                the voice note and album moments for {who}. It can't be undone. You may want to export everything first.
              </p>
              <label className="mt-3 block text-base text-[var(--ink)]">
                Type <strong>delete</strong> to confirm
                <input value={typed} onChange={(e) => setTyped(e.target.value)} className={`${field} mt-2`} autoComplete="off" />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={typed.trim().toLowerCase() !== "delete"}
                  onClick={() => {
                    eraseEverything(activeId);
                    window.location.reload();
                  }}
                  className={primaryBtn}
                >
                  Delete everything for {who}
                </button>
                <button onClick={() => { setConfirming(false); setTyped(""); }} className={secondaryBtn}>
                  Keep everything
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </Page>
  );
}
