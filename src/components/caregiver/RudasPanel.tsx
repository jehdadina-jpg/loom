import { useId, useState } from "react";
import {
  emptyScores,
  RUDAS_ITEMS,
  RUDAS_KEY,
  RUDAS_MAX,
  rudasMessage,
  rudasTotal,
  type RudasRecord,
  type RudasScores,
} from "../../game/clinical/rudas";
import { usePersistentState } from "../../game/state/usePersistentState";
import { useProfile } from "../../game/profiles/ProfileContext";
import { recordForHealthWorker } from "../../game/sync/queue";
import { field, longDate, Page, primaryBtn, secondaryBtn, Section } from "../shared/ui";

/**
 * RUDAS as the clinical anchor, usually given by a health worker at enrolment and repeated
 * every few months. LOOM stores item scores, total, date and who gave it — and says one of
 * two fixed things about the result, nothing more.
 */
export function RudasPanel() {
  const [records, setRecords] = usePersistentState<RudasRecord[]>(RUDAS_KEY, []);
  const [giving, setGiving] = useState(false);
  const [justSaved, setJustSaved] = useState<RudasRecord | null>(null);
  const history = [...records].sort((a, b) => b.date - a.date);

  const lead =
    history.length === 0
      ? "No RUDAS recorded yet. It sets a starting point so the first sessions are pitched about right."
      : `Last given on ${longDate(history[0].date)}. It can be repeated — change over months is worth a doctor seeing.`;

  if (giving) {
    return (
      <RudasForm
        onCancel={() => setGiving(false)}
        onSave={(r) => {
          setRecords((prev) => [...prev, r]);
          setGiving(false);
          setJustSaved(r);
        }}
      />
    );
  }

  return (
    <Page
      title="RUDAS check-up"
      lead={lead}
      actions={
        <button onClick={() => { setJustSaved(null); setGiving(true); }} className={primaryBtn}>
          {history.length ? "Record a new RUDAS" : "Record a RUDAS"}
        </button>
      }
    >
      {justSaved && (
        <div className="mb-6 rounded-2xl border-2 border-[#2c1e14] bg-white p-5" role="status">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#6b563a]">Saved</p>
          <p className="mt-1 text-lg text-[#2c1e14]">
            {justSaved.total} out of {RUDAS_MAX}, {longDate(justSaved.date)}.
          </p>
          <p className="mt-2 text-lg text-[#2c1e14]">{rudasMessage(justSaved.total)}</p>
        </div>
      )}

      <Section
        title="History"
        lead={
          history.length < 2
            ? "Each time it's given, it's added here, oldest at the bottom."
            : history[0].total === history[1].total
              ? "The most recent total is the same as the time before."
              : `The most recent total is ${Math.abs(history[0].total - history[1].total)} ${history[0].total < history[1].total ? "lower" : "higher"} than the time before.`
        }
      >
        {history.length === 0 ? (
          <p className="text-base text-[#6b563a]">Nothing yet.</p>
        ) : (
          <table className="w-full text-left text-base">
            <thead>
              <tr className="border-b border-[#efe3cb] text-[#6b563a]">
                <th scope="col" className="py-2 pr-3 font-medium">Date</th>
                <th scope="col" className="py-2 pr-3 font-medium">Total (out of 30)</th>
                <th scope="col" className="py-2 font-medium">Given by</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="border-b border-[#efe3cb] text-[#2c1e14]">
                  <td className="py-2 pr-3">{longDate(r.date)}</td>
                  <td className="py-2 pr-3">{r.total}</td>
                  <td className="py-2">{r.administeredBy || "Not recorded"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <p className="mt-6 text-base text-[#6b563a]">
        RUDAS is used here because it holds up across education, gender and language, and a health worker can give it after brief
        training. The notes on each item are reminders — use the full administration guide.
      </p>
    </Page>
  );
}

function RudasForm({ onCancel, onSave }: { onCancel: () => void; onSave: (r: RudasRecord) => void }) {
  const { activeId } = useProfile();
  const [scores, setScores] = useState<RudasScores>(emptyScores);
  const [by, setBy] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const byId = useId();
  const dateId = useId();
  const total = rudasTotal(scores);

  function save() {
    const [y, m, d] = date.split("-").map(Number);
    const record: RudasRecord = {
      id: `rudas${Date.now().toString(36)}`,
      date: new Date(y, m - 1, d, 12).getTime(),
      administeredBy: by.trim(),
      scores,
      total,
    };
    recordForHealthWorker(activeId, { kind: "rudas", t: record.date, total, items: { ...scores }, administeredBy: record.administeredBy });
    onSave(record);
  }

  return (
    <Page title="Record a RUDAS" lead="Score each item as you go. The total adds itself up.">
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <label htmlFor={byId} className="block text-base font-medium text-[#2c1e14]">
          Given by
          <input id={byId} value={by} onChange={(e) => setBy(e.target.value)} placeholder="e.g. ASHA worker's name" className={`${field} mt-2`} />
        </label>
        <label htmlFor={dateId} className="block text-base font-medium text-[#2c1e14]">
          Date
          <input id={dateId} type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} mt-2`} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {RUDAS_ITEMS.map((item) => {
          const value = scores[item.id];
          // functional, so quick repeated taps each count
          const step = (delta: number) =>
            setScores((s) => ({ ...s, [item.id]: Math.min(item.max, Math.max(0, s[item.id] + delta)) }));
          return (
            <section key={item.id} className="rounded-2xl border border-[#e6d3ae] bg-white p-5 shadow-sm">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-[#2c1e14]">{item.label}</h2>
                <span className="text-base text-[#6b563a]">0 to {item.max}</span>
              </div>
              <p className="mt-1 text-base text-[#6b563a]">{item.instruction}</p>
              <div className="mt-4 flex items-center gap-3" role="group" aria-label={`${item.label} score`}>
                <button onClick={() => step(-1)} disabled={value <= 0} className={`${secondaryBtn} h-12 w-12 !px-0 text-2xl`} aria-label={`Lower ${item.label}`}>
                  −
                </button>
                <output className="min-w-[4ch] text-center text-2xl font-bold text-[#2c1e14]" aria-live="polite">
                  {value}
                </output>
                <button onClick={() => step(1)} disabled={value >= item.max} className={`${secondaryBtn} h-12 w-12 !px-0 text-2xl`} aria-label={`Raise ${item.label}`}>
                  +
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e6d3ae] bg-[#fdf6e8] p-4 shadow-lg">
        <p className="mr-auto text-xl font-bold text-[#2c1e14]">
          Total {total} <span className="font-normal text-[#6b563a]">out of {RUDAS_MAX}</span>
        </p>
        <button onClick={onCancel} className={secondaryBtn}>
          Cancel
        </button>
        <button onClick={save} className={primaryBtn}>
          Save
        </button>
      </div>
    </Page>
  );
}
