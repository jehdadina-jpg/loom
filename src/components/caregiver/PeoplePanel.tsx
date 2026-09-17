import { useState } from "react";
import { useProfile, type PersonDetails } from "../../game/profiles/ProfileContext";

/**
 * More than one person can share a device — a health worker visiting several homes,
 * or two people in the same household. Each profile keeps its own settings, session
 * history, album and photos; nothing is ever pooled between them.
 */
export function PeoplePanel() {
  const { profiles, activeId, active, setActive, addProfile, renameProfile, setNotes, removeProfile, setPerson } = useProfile();
  const [newName, setNewName] = useState("");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--ink)]">People</h1>
        <p className="text-[var(--ink-soft)]">
          Each person has their own settings, history and photos. Records are never shared between profiles.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--ink)]">On this device</h2>
        <p className="mb-3 text-[var(--ink-soft)]">
          {profiles.length === 1 ? "One person uses LOOM on this device." : `${profiles.length} people use LOOM on this device.`}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
        {profiles.map((p) => {
          const isActive = p.id === activeId;
          return (
            <div
              key={p.id}
              className={`rounded-[6px] border-2 p-4 transition ${
                isActive ? "border-[var(--accent-shadow)] bg-[#f6e3b8]" : "border-[var(--parchment2)] bg-[var(--parchment)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <input
                  value={p.name}
                  onChange={(e) => renameProfile(p.id, e.target.value)}
                  className="w-full bg-transparent text-lg font-semibold text-[var(--ink)] focus:outline-none"
                />
                {isActive ? (
                  <span className="shrink-0 rounded-[6px] bg-[var(--accent)] px-2.5 py-1 text-sm font-medium text-[var(--on-accent)]">
                    Active
                  </span>
                ) : (
                  <button
                    onClick={() => setActive(p.id)}
                    className="shrink-0 rounded-[6px] border-2 border-[var(--parchment2)] px-3 py-1.5 text-sm text-[var(--ink-soft)] hover:bg-[var(--parchment2)]"
                  >
                    Switch to
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                Added {new Date(p.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              </p>
              {profiles.length > 1 && (
                <button
                  onClick={() => removeProfile(p.id)}
                  className="mt-3 text-sm text-[var(--ink-soft)] underline underline-offset-2 hover:text-[var(--terracotta)]"
                >
                  Remove profile
                </button>
              )}
            </div>
          );
        })}
        </div>
      </section>

      <section className="mb-8 rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-5">
        <h2 className="mb-1 font-semibold text-[var(--ink)]">Add someone</h2>
        <p className="mb-2 text-sm text-[var(--ink-soft)]">Add another person or household. Their records are kept completely separate.</p>
        <div className="flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name or household"
            className="flex-1 rounded-[6px] border-2 border-[var(--parchment2)] px-3 py-2 text-[var(--ink)] focus:border-[var(--accent-shadow)] focus:outline-none"
          />
          <button
            onClick={() => {
              if (!newName.trim()) return;
              addProfile(newName);
              setNewName("");
            }}
            className="rounded-[6px] bg-[var(--ink)] px-4 py-2 font-medium text-[var(--parchment)] hover:bg-[var(--ink-hover)]"
          >
            Add
          </button>
        </div>
      </section>

      <PersonDetailsForm
        key={active.id}
        person={active.person}
        onChange={(p) => setPerson(active.id, p)}
      />

      <section className="rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-5">
        <h2 className="mb-1 font-semibold text-[var(--ink)]">Notes about {active.name}</h2>
        <p className="mb-3 text-sm text-[var(--ink-soft)]">
          Anything that helps whoever sits with them next — the village they grew up in, who's who in the family, what
          settles them on a hard day.
        </p>
        <textarea
          value={active.notes}
          onChange={(e) => setNotes(active.id, e.target.value)}
          rows={6}
          placeholder="e.g. Grew up near the river. Calms down with the water point and the old song. Prefers larger text in the evening."
          className="w-full rounded-[6px] border-2 border-[var(--parchment2)] px-3 py-2 text-[var(--ink)] focus:border-[var(--accent-shadow)] focus:outline-none"
        />
      </section>
    </div>
  );
}

/** The person's own details — used on referral summaries and, name and age only, by the health worker. */
function PersonDetailsForm({ person, onChange }: { person?: PersonDetails; onChange: (p: PersonDetails) => void }) {
  const current: PersonDetails = person ?? { fullName: "", birthYear: null, pronouns: "name" };
  const set = (patch: Partial<PersonDetails>) => onChange({ ...current, ...patch });
  // typed separately so a half-typed year ("19") isn't wiped out
  const [yearText, setYearText] = useState(current.birthYear ? String(current.birthYear) : "");
  return (
    <section className="mb-8 rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-5">
      <h2 className="mb-1 font-semibold text-[var(--ink)]">The person being cared for</h2>
      <p className="mb-3 text-sm text-[var(--ink-soft)]">
        Their own name and age go on the summary for a doctor. A health worker sees these two things and nothing else from
        this page.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-[var(--ink-soft)]">
          Full name
          <input
            value={current.fullName}
            onChange={(e) => set({ fullName: e.target.value })}
            placeholder="e.g. Kamala Devi"
            className="mt-1 w-full rounded-[6px] border-2 border-[var(--parchment2)] px-3 py-2 text-base text-[var(--ink)] focus:border-[var(--accent-shadow)] focus:outline-none"
          />
        </label>
        <label className="text-sm text-[var(--ink-soft)]">
          Year of birth
          <input
            inputMode="numeric"
            value={yearText}
            onChange={(e) => {
              setYearText(e.target.value);
              const n = parseInt(e.target.value, 10);
              set({ birthYear: Number.isFinite(n) && n > 1900 && n <= new Date().getFullYear() ? n : null });
            }}
            placeholder="e.g. 1954"
            className="mt-1 w-full rounded-[6px] border-2 border-[var(--parchment2)] px-3 py-2 text-base text-[var(--ink)] focus:border-[var(--accent-shadow)] focus:outline-none"
          />
        </label>
        <label className="text-sm text-[var(--ink-soft)]">
          In app text, refer to them as
          <select
            value={current.pronouns}
            onChange={(e) => set({ pronouns: e.target.value as PersonDetails["pronouns"] })}
            className="mt-1 w-full rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] px-3 py-2 text-base text-[var(--ink)] focus:border-[var(--accent-shadow)] focus:outline-none"
          >
            <option value="name">Their name</option>
            <option value="she">she / her</option>
            <option value="he">he / him</option>
            <option value="they">they / them</option>
          </select>
        </label>
      </div>
    </section>
  );
}
