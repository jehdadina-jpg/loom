/**
 * "Export everything" as one web page a family can open in any browser: readable sections
 * first, with photos and the voice note inside it, and the raw records at the very end for
 * anyone who needs them. Rendered to a static file, so it uses its own styles.
 */
import type { Profile } from "../../game/profiles/ProfileContext";
import type { TelemetryEvent } from "../../game/telemetry/store";
import type { Memory } from "../../game/session/SessionContext";
import type { FamilyPhoto } from "../../game/photos/PhotoLibrary";
import type { Reminder, ReminderLogEntry } from "../../game/reminders/model";
import { describeSchedule } from "../../game/reminders/model";
import type { RudasRecord } from "../../game/clinical/rudas";
import type { WellbeingState } from "../../game/wellbeing/checkin";
import { QUESTIONS, SCALE } from "../../game/wellbeing/checkin";
import type { AlertEntry } from "../../game/alerts/AlertsContext";
import { formatDuration, sessionActivityTitle, sessionRecords, sessionSentence } from "../../game/session/history";
import { computeTrajectory } from "../../game/trajectory/trajectory";
import { personWords } from "../../game/profiles/words";
import type { HealthWorkerEvent } from "../../health-worker/boundary";
import { DomainCharts } from "../charts/DomainCharts";

export const ARCHIVE_CSS = `
body { margin: 0; background: #e8dcc0; }
.archive { font-family: "Segoe UI", system-ui, sans-serif; color: #2e2318; max-width: 860px; margin: 0 auto; padding: 24px; line-height: 1.45; }
.archive h1 { font-size: 26px; margin: 0 0 4px; }
.archive h2 { font-size: 19px; margin: 28px 0 8px; border-bottom: 2px solid #e8dcc0; padding-bottom: 4px; }
.archive p, .archive li, .archive td, .archive th, .archive figcaption { font-size: 15px; }
.archive table { border-collapse: collapse; width: 100%; background: #f7efdc; }
.archive td, .archive th { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e8dcc0; vertical-align: top; }
.archive .photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.archive figure { margin: 0; background: #f7efdc; border: 1px solid #e8dcc0; border-radius: 6px; overflow: hidden; }
.archive figure img { width: 100%; display: block; }
.archive figcaption { padding: 6px 8px; }
.archive pre { white-space: pre-wrap; word-break: break-word; font-size: 14px; background: #f7efdc; border: 1px solid #e8dcc0; padding: 12px; border-radius: 6px; }
`;

export interface ArchiveInput {
  profile: Profile;
  events: TelemetryEvent[];
  record: HealthWorkerEvent[];
  memories: Memory[];
  photos: FamilyPhoto[];
  voice: { url: string | null; label: string | null };
  reminders: Reminder[];
  reminderLog: ReminderLogEntry[];
  rudas: RudasRecord[];
  wellbeing: WellbeingState;
  alerts: AlertEntry[];
  raw: Record<string, unknown>;
  exportedAt: number;
}

const when = (t: number) =>
  new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export function ArchiveDocument({ data }: { data: ArchiveInput }) {
  const { profile } = data;
  const sessions = sessionRecords(data.events).reverse();
  const words = personWords(profile.person);
  const trajectory = computeTrajectory(data.record, data.exportedAt);

  return (
    <main className="archive">
      <h1>Everything LOOM holds for {profile.person?.fullName || profile.name}</h1>
      <p>Exported {when(data.exportedAt)}. This file is yours: it opens in any web browser and needs no internet connection.</p>

      <h2>About</h2>
      <table>
        <tbody>
          <tr><th>Household</th><td>{profile.name}</td></tr>
          <tr><th>Name</th><td>{profile.person?.fullName || "Not entered"}</td></tr>
          <tr><th>Year of birth</th><td>{profile.person?.birthYear ?? "Not entered"}</td></tr>
          <tr><th>Added to LOOM</th><td>{when(profile.createdAt)}</td></tr>
          <tr><th>Notes</th><td style={{ whiteSpace: "pre-wrap" }}>{profile.notes || "None"}</td></tr>
        </tbody>
      </table>

      <h2>Sessions</h2>
      {sessions.length === 0 ? (
        <p>No sessions recorded on this device.</p>
      ) : (
        <table>
          <thead><tr><th>When</th><th>How long</th><th>Activity</th><th>How it went</th></tr></thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.sessionId}>
                <td>{when(s.startedAt)}</td>
                <td>{formatDuration(s.endedAt - s.startedAt)}</td>
                <td>{sessionActivityTitle(s)}</td>
                <td>{sessionSentence(s)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Change over time</h2>
      <DomainCharts trajectory={trajectory} words={words} now={data.exportedAt} />

      <h2>RUDAS</h2>
      {data.rudas.length === 0 ? (
        <p>None recorded.</p>
      ) : (
        <table>
          <thead><tr><th>Date</th><th>Total (out of 30)</th><th>Given by</th><th>Items</th></tr></thead>
          <tbody>
            {[...data.rudas].sort((a, b) => b.date - a.date).map((r) => (
              <tr key={r.id}>
                <td>{when(r.date)}</td>
                <td>{r.total}</td>
                <td>{r.administeredBy || "Not recorded"}</td>
                <td>{Object.entries(r.scores).map(([k, v]) => `${k} ${v}`).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Memory Vault</h2>
      <p>Family photos, the family voice note and album moments. These never leave this device except in a file like this one.</p>
      {data.photos.length > 0 ? (
        <div className="photos">
          {data.photos.map((p) => (
            <figure key={p.id}>
              <img src={p.dataUrl} alt={p.caption || "Family photo"} />
              <figcaption>{p.caption || "No caption"}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p>No family photos.</p>
      )}
      {data.voice.url ? (
        <p>
          {data.voice.label || "Family voice note"}: <audio controls src={data.voice.url} />
        </p>
      ) : (
        <p>No voice note.</p>
      )}
      {data.memories.length > 0 && (
        <ul>
          {[...data.memories].reverse().map((m) => (
            <li key={m.id}>
              {when(m.timestamp)} — {m.title}: {m.note}
            </li>
          ))}
        </ul>
      )}

      <h2>Reminders</h2>
      {data.reminders.length === 0 ? (
        <p>No reminders.</p>
      ) : (
        <table>
          <thead><tr><th>Reminder</th><th>When</th><th>Photo</th><th>Last marked done</th></tr></thead>
          <tbody>
            {data.reminders.map((r) => {
              const last = data.reminderLog.filter((e) => e.type === "done" && e.reminderId === r.id).sort((a, b) => b.timestamp - a.timestamp)[0];
              return (
                <tr key={r.id}>
                  <td>{r.label} ({r.category})</td>
                  <td>{describeSchedule(r.schedule)}</td>
                  <td>{r.photo ? <img src={r.photo} alt="" style={{ width: 90, borderRadius: 6 }} /> : "None"}</td>
                  <td>{last ? when(last.timestamp) : "Not yet"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2>Alerts</h2>
      {data.alerts.length === 0 ? (
        <p>No alerts.</p>
      ) : (
        <ul>
          {[...data.alerts].sort((a, b) => b.raisedAt - a.raisedAt).map((a) => (
            <li key={a.id}>
              {when(a.raisedAt)} — {a.sentence} {a.handledAt ? `(handled ${when(a.handledAt)})` : "(open)"}
            </li>
          ))}
        </ul>
      )}

      <h2>Caregiver check-ins</h2>
      {data.wellbeing.checkins.length === 0 ? (
        <p>None.</p>
      ) : (
        <ul>
          {data.wellbeing.checkins.map((c) => (
            <li key={c.id}>
              Week of {when(c.week)}:{" "}
              {QUESTIONS.filter((q) => c.answers[q.id] !== undefined)
                .map((q) => `${q.text} ${SCALE[c.answers[q.id]]}`)
                .join(" · ")}
            </li>
          ))}
        </ul>
      )}

      <h2>The raw records</h2>
      <p>The same information in the form LOOM stores it, for anyone who needs to move it to another system.</p>
      <pre>{JSON.stringify(data.raw, (_key, v) => (typeof v === "string" && v.startsWith("data:") && v.length > 200 ? `${v.slice(0, 40)}… (shown above)` : v), 2)}</pre>
    </main>
  );
}
