import { useRef, useState } from "react";
import { usePhotos, fileToPhotoDataUrl } from "../../game/photos/PhotoLibrary";

/**
 * Family photos become reminiscence content at the veranda and water point.
 * They are never turned into a quiz — the person is never asked to identify anyone.
 */
export function PhotosPanel() {
  const { photos, addPhoto, updateCaption, removePhoto, error } = usePhotos();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setFailed(null);
    try {
      for (const file of Array.from(files).slice(0, 6)) {
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await fileToPhotoDataUrl(file);
        addPhoto(dataUrl, "");
      }
    } catch {
      setFailed("That image couldn't be read. Try a JPEG or PNG.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Family Photos</h1>
        <p className="max-w-2xl text-slate-500">
          Add pictures of people and places they know. These appear as something to look at and talk about — never as a
          test. Photos are resized and kept on this device only.
        </p>
      </header>

      <div className="mb-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add photos"}
        </button>
        <p className="mt-2 text-sm text-slate-500">Up to six at a time, 24 kept in total.</p>
        {failed && <p className="mt-2 text-sm text-rose-600">{failed}</p>}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>

      {photos.length === 0 ? (
        <p className="text-slate-500">No photos yet — the option stays hidden in the game until one is added.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos
            .slice()
            .reverse()
            .map((p) => (
              <figure key={p.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <img src={p.dataUrl} alt={p.caption || "Family photo"} className="h-44 w-full object-cover" />
                <figcaption className="p-3">
                  <input
                    value={p.caption}
                    onChange={(e) => updateCaption(p.id, e.target.value)}
                    placeholder="Who or what is this?"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">Read aloud when narration is on.</p>
                  <button
                    onClick={() => removePhoto(p.id)}
                    className="mt-2 text-sm text-slate-500 underline underline-offset-2 hover:text-rose-600"
                  >
                    Remove
                  </button>
                </figcaption>
              </figure>
            ))}
        </div>
      )}
    </div>
  );
}
