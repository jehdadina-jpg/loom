import { useState } from "react";
import { useProfile } from "../../game/profiles/ProfileContext";

/**
 * More than one person can share a device — a health worker visiting several homes,
 * or two people in the same household. Each profile keeps its own settings, session
 * history, album and photos; nothing is ever pooled between them.
 */
export function PeoplePanel() {
  const { profiles, activeId, active, setActive, addProfile, renameProfile, setNotes, removeProfile } = useProfile();
  const [newName, setNewName] = useState("");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">People</h1>
        <p className="text-slate-500">
          Each person has their own settings, history and photos. Records are never shared between profiles.
        </p>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-2">
        {profiles.map((p) => {
          const isActive = p.id === activeId;
          return (
            <div
              key={p.id}
              className={`rounded-2xl border p-4 transition ${
                isActive ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <input
                  value={p.name}
                  onChange={(e) => renameProfile(p.id, e.target.value)}
                  className="w-full bg-transparent text-lg font-semibold text-slate-800 focus:outline-none"
                />
                {isActive ? (
                  <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white">
                    Active
                  </span>
                ) : (
                  <button
                    onClick={() => setActive(p.id)}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Switch to
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Added {new Date(p.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              </p>
              {profiles.length > 1 && (
                <button
                  onClick={() => removeProfile(p.id)}
                  className="mt-3 text-sm text-slate-500 underline underline-offset-2 hover:text-rose-600"
                >
                  Remove profile
                </button>
              )}
            </div>
          );
        })}
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 font-semibold text-slate-800">Add someone</h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name or household"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={() => {
              if (!newName.trim()) return;
              addProfile(newName);
              setNewName("");
            }}
            className="rounded-lg bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700"
          >
            Add
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 font-semibold text-slate-800">Notes about {active.name}</h2>
        <p className="mb-3 text-sm text-slate-500">
          Anything that helps whoever sits with them next — the village they grew up in, who's who in the family, what
          settles them on a hard day.
        </p>
        <textarea
          value={active.notes}
          onChange={(e) => setNotes(active.id, e.target.value)}
          rows={6}
          placeholder="e.g. Grew up near the river. Calms down with the water point and the old song. Prefers larger text in the evening."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none"
        />
      </section>
    </div>
  );
}
