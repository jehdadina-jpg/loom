/**
 * WHAT EARNS ITS PLACE — the vault only helps if the family keeps feeding it. This panel
 * reads engagement plainly (never a score) and, more importantly, makes the coverage gap
 * visible: the photos, songs and recordings that don't exist yet, quietly leaving
 * activities to repeat the same few prompts.
 */
import { useMemo } from "react";
import { useTelemetry } from "../../game/telemetry/store";
import { usePhotos } from "../../game/photos/PhotoLibrary";
import { useSettings } from "../../game/state/SettingsContext";
import { computeVaultReading, type RatedItem, type CoverageGap } from "../../game/vault/engagement";

const KIND_ICON: Record<RatedItem["item"]["kind"], string> = { photo: "📷", song: "🎵", story: "📖", voice: "👤" };

export function VaultEngagementPanel({ onAddPhotos, onAddVoice }: { onAddPhotos: () => void; onAddVoice: () => void }) {
  const { events } = useTelemetry();
  const { photos } = usePhotos();
  const { settings } = useSettings();
  const hasVoice = Boolean(settings.familyVoiceUrl);
  const reading = useMemo(() => computeVaultReading(events, photos, hasVoice), [events, photos, hasVoice]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--ink)]">What earns its place</h1>
        <p className="mt-1 text-[var(--ink)]">Which saved photos, songs and recordings actually reach her — and what the vault is still missing.</p>
      </header>

      {reading.state === "getting-to-know" ? (
        <section className="rounded-[6px] border-2 border-dashed border-[var(--ink-soft)] bg-[var(--parchment)] p-5">
          <p className="text-lg text-[var(--ink)]">Still learning what she responds to.</p>
          <p className="mt-1 text-base text-[var(--ink-soft)]">
            {reading.visitsSoFar} of {reading.visitsNeeded} quiet moments so far. Nothing is compared until there's enough to go on.
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-[6px] border-2 border-[var(--good)] bg-[var(--good-soft)] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--good-ink)]">What she responds to</h2>
            {reading.respondsTo.length === 0 ? (
              <p className="mt-2 text-base text-[var(--good-ink)]">Nothing stands out clearly above the rest yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {reading.respondsTo.map((r) => (
                  <ItemLine key={r.item.id} r={r} tone="good" />
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Less so</h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">Some content just doesn't land. That happens, and it isn't a shortfall of hers.</p>
            {reading.lessSo.length === 0 ? (
              <p className="mt-2 text-base text-[var(--ink)]">Nothing stands out as consistently missing the mark.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {reading.lessSo.map((r) => (
                  <ItemLine key={r.item.id} r={r} tone="quiet" />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="rounded-[6px] border-2 border-[var(--watch)] bg-[var(--watch-soft)] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--watch-ink)]">The coverage gap</h2>
        {reading.gaps.length === 0 ? (
          <p className="mt-2 text-base text-[var(--watch-ink)]">The vault is well stocked — nothing obvious missing right now.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {reading.gaps.map((g) => (
              <GapLine key={g.id} g={g} onAddPhotos={onAddPhotos} onAddVoice={onAddVoice} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ItemLine({ r, tone }: { r: RatedItem; tone: "good" | "quiet" }) {
  const textClass = tone === "good" ? "text-[var(--good-ink)]" : "text-[var(--ink)]";
  return (
    <li className={`flex items-start gap-2 text-lg ${textClass}`}>
      <span aria-hidden>{KIND_ICON[r.item.kind]}</span>
      <span>
        <strong className="font-semibold">{r.item.label}</strong> — {r.phrase}
      </span>
    </li>
  );
}

function GapLine({ g, onAddPhotos, onAddVoice }: { g: CoverageGap; onAddPhotos: () => void; onAddVoice: () => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 text-lg text-[var(--watch-ink)]">
      <span>{g.text}</span>
      <button
        onClick={g.addTarget === "photos" ? onAddPhotos : onAddVoice}
        className="shrink-0 rounded-[6px] border-2 border-[var(--watch)] bg-[var(--parchment)] px-3 py-1.5 text-base font-semibold text-[var(--watch-ink)] hover:bg-[var(--watch-soft)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
      >
        Add
      </button>
    </li>
  );
}
