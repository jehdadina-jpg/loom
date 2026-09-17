import { useSettings } from "../../game/state/SettingsContext";
import { COMMUNITY_PACKS } from "../../data/community/packs";

/** Moved out of Setup so it can be its own section; the content is unchanged. */
export function CommunityPackPanel() {
  const { settings, update } = useSettings();
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <section>
        <h2 className="mb-1 text-lg font-semibold text-[var(--ink)]">Community pack</h2>
        <p className="mb-3 text-sm text-[var(--ink-soft)]">
          Swaps in local greetings, village naming and accent colour. The core village stays neutral so it isn't tied to
          any one state's culture.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          {COMMUNITY_PACKS.map((p) => (
            <button
              key={p.id}
              onClick={() => update({ communityPackId: p.id })}
              className={`rounded-[6px] border-2 p-4 text-left transition ${
                settings.communityPackId === p.id
                  ? "border-[var(--accent-shadow)] bg-[#f6e3b8]"
                  : "border-[var(--parchment2)] bg-[var(--parchment)] hover:bg-[var(--parchment2)]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: p.accent }} />
                <span className="font-medium text-[var(--ink)]">{p.label}</span>
              </span>
              <span className="mt-1 block text-sm text-[var(--ink-soft)]">“{p.greetingWord}”</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}
