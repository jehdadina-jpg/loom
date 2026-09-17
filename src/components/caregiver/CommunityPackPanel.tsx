import { useSettings } from "../../game/state/SettingsContext";
import { COMMUNITY_PACKS } from "../../data/community/packs";

/** Moved out of Setup so it can be its own section; the content is unchanged. */
export function CommunityPackPanel() {
  const { settings, update } = useSettings();
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <section>
        <h2 className="mb-1 text-lg font-semibold text-slate-800">Community pack</h2>
        <p className="mb-3 text-sm text-slate-500">
          Swaps in local greetings, village naming and accent colour. The core village stays neutral so it isn't tied to
          any one state's culture.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          {COMMUNITY_PACKS.map((p) => (
            <button
              key={p.id}
              onClick={() => update({ communityPackId: p.id })}
              className={`rounded-xl border p-4 text-left transition ${
                settings.communityPackId === p.id
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: p.accent }} />
                <span className="font-medium text-slate-800">{p.label}</span>
              </span>
              <span className="mt-1 block text-sm text-slate-500">“{p.greetingWord}”</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}
