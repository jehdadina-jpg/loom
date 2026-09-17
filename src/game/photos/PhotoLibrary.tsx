// @loom-vault — holds family photographs. Must never be reachable from the health-worker route (/asha).
// tests/boundary.test.ts finds every file carrying this marker and fails if /asha can import it.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useProfile, scopedKey } from "../profiles/ProfileContext";

export interface FamilyPhoto {
  id: string;
  dataUrl: string;
  caption: string;
  addedAt: number;
}

const STORAGE_KEY = "loom_photos_v1";
const MAX_PHOTOS = 24;
/** Downscaled before storing — full-resolution phone photos would blow the storage quota. */
const MAX_EDGE = 720;

function load(key: string): FamilyPhoto[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as FamilyPhoto[]) : [];
  } catch {
    return [];
  }
}

/** Reads a picked file, scales it down, and returns a compact JPEG data URL. */
export async function fileToPhotoDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.78);
}

interface PhotoContextValue {
  photos: FamilyPhoto[];
  addPhoto: (dataUrl: string, caption: string) => void;
  updateCaption: (id: string, caption: string) => void;
  removePhoto: (id: string) => void;
  error: string | null;
}

const PhotoContext = createContext<PhotoContextValue | null>(null);

export function PhotoProvider({ children }: { children: ReactNode }) {
  const { activeId } = useProfile();
  const key = scopedKey(STORAGE_KEY, activeId);
  const [photos, setPhotos] = useState<FamilyPhoto[]>(() => load(key));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPhotos(load(scopedKey(STORAGE_KEY, activeId)));
  }, [activeId]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(photos));
      setError(null);
    } catch {
      // photos are the one thing here big enough to actually hit the quota
      setError("This device is out of storage space for photos. Remove one before adding another.");
    }
  }, [photos, key]);

  const addPhoto = useCallback((dataUrl: string, caption: string) => {
    setPhotos((p) =>
      [...p, { id: `ph${Date.now().toString(36)}`, dataUrl, caption, addedAt: Date.now() }].slice(-MAX_PHOTOS),
    );
  }, []);

  const updateCaption = useCallback((id: string, caption: string) => {
    setPhotos((p) => p.map((ph) => (ph.id === id ? { ...ph, caption } : ph)));
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((p) => p.filter((ph) => ph.id !== id));
  }, []);

  const value = useMemo(
    () => ({ photos, addPhoto, updateCaption, removePhoto, error }),
    [photos, addPhoto, updateCaption, removePhoto, error],
  );
  return <PhotoContext.Provider value={value}>{children}</PhotoContext.Provider>;
}

export function usePhotos(): PhotoContextValue {
  const ctx = useContext(PhotoContext);
  if (!ctx) throw new Error("usePhotos must be used within PhotoProvider");
  return ctx;
}
