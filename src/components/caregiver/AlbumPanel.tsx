import { useSession } from "../../game/session/SessionContext";
import { PixelSprite } from "../pixel/PixelSprite";
import { iconSprite, iconForLocation } from "../../engine/sprites/icons";

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yest = new Date(today.getTime() - 86400000);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

/**
 * Moments from the visit, written warmly and without any measurement.
 * This is the part of the record a family would actually want to read.
 */
export function AlbumPanel() {
  const { memories, clearMemories } = useSession();
  const grouped = memories
    .slice()
    .reverse()
    .reduce<Record<string, typeof memories>>((acc, m) => {
      const key = dayLabel(m.timestamp);
      (acc[key] ??= []).push(m);
      return acc;
    }, {});

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--ink)]">Family Album</h1>
          <p className="text-[var(--ink-soft)]">Moments from the village — kept as memories, not results.</p>
        </div>
        {memories.length > 0 && (
          <button
            onClick={clearMemories}
            className="rounded-[6px] border-2 border-[var(--parchment2)] px-3 py-2 text-sm text-[var(--ink-soft)] hover:bg-[var(--parchment2)]"
          >
            Clear album
          </button>
        )}
      </header>

      {memories.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-[var(--ink-soft)] bg-[var(--parchment)] p-10 text-center">
          <p className="text-lg font-medium text-[var(--ink)]">The album is empty for now.</p>
          <p className="mt-1 text-[var(--ink-soft)]">
            Each thing done in the village — making tea, naming faces, watering the garden — is saved here as a small
            note.
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([day, entries]) => (
          <section key={day} className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{day}</h2>
            <p className="mb-3 text-[var(--ink)]">
              {entries.length === 1 ? "One moment" : `${entries.length} moments`} saved, starting with {entries[entries.length - 1].title.toLowerCase()}.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {entries.map((m) => (
                <article
                  key={m.id}
                  className="flex items-start gap-3 rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment)] p-4 "
                >
                  <div className="mt-0.5 shrink-0 rounded-[6px] bg-[var(--parchment2)] p-2">
                    <PixelSprite bitmap={() => iconSprite(iconForLocation(m.locationId))} scale={2} />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--ink)]">{m.title}</p>
                    <p className="text-[var(--ink-soft)]">{m.note}</p>
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">
                      {new Date(m.timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
