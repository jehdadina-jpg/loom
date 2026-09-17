import { useEffect, useRef, useState } from "react";
import { NineSlicePanel } from "../../components/pixel/NineSlicePanel";
import { PixelButton } from "../../components/pixel/PixelButton";
import { useTelemetry } from "../telemetry/store";
import { useSettings } from "../state/SettingsContext";
import { usePhotos } from "../photos/PhotoLibrary";
import { speechEngine } from "../speech/SpeechEngine";

export interface ComfortPanelProps {
  locationId: string;
  onClose: () => void;
}

type Mode = "story" | "song" | "voice" | "photos";

const STORY =
  "Long ago, the river ran past this very spot. After the day's work the elders would rest here, watching the water carry the evening light down the valley. Nobody hurried. There was nothing here that needed doing.";

const SONG_LINES = [
  "A soft, familiar tune hums along with the water.",
  "The kind of song sung while working, or rocking a child to sleep.",
  "You may know the words. You may just listen.",
];

/** Purely passive comfort content — this panel never asks the patient anything. */
export function ComfortPanel({ locationId, onClose }: ComfortPanelProps) {
  const { log } = useTelemetry();
  const { settings } = useSettings();
  const { photos } = usePhotos();
  const [playing, setPlaying] = useState<Mode | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // what's on screen right now, and when it appeared — so the dwell logged for each item
  // is how long she actually looked at or listened to that one thing, not the whole visit.
  const shownRef = useRef<{ itemId: string; contentType: Mode; since: number } | null>(null);

  function flush() {
    const s = shownRef.current;
    if (!s) return;
    log({ type: "comfort", locationId, contentType: s.contentType, itemId: s.itemId, dwellMs: Date.now() - s.since, timestamp: Date.now() });
    shownRef.current = null;
  }

  useEffect(() => {
    return () => {
      flush();
      audioRef.current?.pause();
      speechEngine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(kind: Mode) {
    setPlaying(kind);
    if (kind === "story") {
      shownRef.current = { itemId: "story", contentType: "story", since: Date.now() };
      speechEngine.speak(STORY);
    }
    if (kind === "song") {
      shownRef.current = { itemId: "song", contentType: "song", since: Date.now() };
      speechEngine.speak(SONG_LINES.join(" "));
    }
    if (kind === "photos" && photos.length) {
      setPhotoIndex(0);
      shownRef.current = { itemId: photos[0].id, contentType: "photos", since: Date.now() };
      speechEngine.speak(photos[0].caption || "A photograph from home.");
    }
    if (kind === "voice" && settings.familyVoiceUrl) {
      shownRef.current = { itemId: "voice", contentType: "voice", since: Date.now() };
      const el = new Audio(settings.familyVoiceUrl);
      audioRef.current = el;
      void el.play().catch(() => {
        /* playback blocked — the written line below still stands in */
      });
    }
  }

  function showPhoto(next: number) {
    flush();
    const idx = (next + photos.length) % photos.length;
    setPhotoIndex(idx);
    shownRef.current = { itemId: photos[idx].id, contentType: "photos", since: Date.now() };
    speechEngine.speak(photos[idx].caption || "A photograph from home.");
  }

  function finish() {
    flush();
    onClose();
  }

  const ts = settings.textScale;
  const photo = photos[photoIndex];

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <NineSlicePanel
        tone="parchment"
        className="max-h-[94%] w-full max-w-xl overflow-y-auto rounded-xl p-6 text-center shadow-2xl"
      >
        {!playing ? (
          <>
            <h2 className="font-pixel mb-4 text-[#3b2a1a]" style={{ fontSize: 13 * ts }}>
              A Quiet Moment
            </h2>
            <p className="mb-6 text-[#5c4529]" style={{ fontSize: 18 * ts }}>
              Rest here as long as you like.
            </p>
            <div className="flex flex-col gap-3">
              <PixelButton tone="wood" onClick={() => choose("story")}>
                Listen to a Story
              </PixelButton>
              <PixelButton tone="wood" onClick={() => choose("song")}>
                Listen to a Song
              </PixelButton>
              {photos.length > 0 && (
                <PixelButton tone="wood" onClick={() => choose("photos")}>
                  Look at Photos
                </PixelButton>
              )}
              {settings.familyVoiceUrl && (
                <PixelButton tone="amber" onClick={() => choose("voice")}>
                  {settings.familyVoiceLabel ?? "A Voice from Family"}
                </PixelButton>
              )}
            </div>
            <button
              onClick={onClose}
              className="mt-6 text-[#6b563a] underline underline-offset-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
              style={{ fontSize: 14 * ts }}
            >
              Go back
            </button>
          </>
        ) : playing === "photos" && photo ? (
          <div className="flex flex-col items-center gap-4">
            <img
              src={photo.dataUrl}
              alt={photo.caption || "A family photograph"}
              className="max-h-[46vh] w-full rounded-lg object-contain"
              style={{ border: "3px solid #6d4a2f", background: "#2e1c13" }}
            />
            <p className="leading-relaxed text-[#3b2a1a]" style={{ fontSize: 19 * ts }}>
              {photo.caption || "A photograph from home."}
            </p>
            <div className="flex items-center gap-3">
              {photos.length > 1 && (
                <PixelButton tone="wood" onClick={() => showPhoto(photoIndex - 1)}>
                  Back
                </PixelButton>
              )}
              {photos.length > 1 && (
                <PixelButton tone="wood" onClick={() => showPhoto(photoIndex + 1)}>
                  Next
                </PixelButton>
              )}
              <PixelButton tone="leaf" onClick={finish}>
                Done
              </PixelButton>
            </div>
            <p className="text-[#6b563a]" style={{ fontSize: 13 * ts }}>
              {photoIndex + 1} of {photos.length}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 py-2">
            {playing === "story" && (
              <p className="leading-relaxed text-[#3b2a1a]" style={{ fontSize: 19 * ts }}>
                {STORY}
              </p>
            )}
            {playing === "song" && (
              <div className="space-y-2">
                {SONG_LINES.map((line) => (
                  <p key={line} className="leading-relaxed text-[#3b2a1a]" style={{ fontSize: 19 * ts }}>
                    {line}
                  </p>
                ))}
              </div>
            )}
            {playing === "voice" && (
              <p className="leading-relaxed text-[#3b2a1a]" style={{ fontSize: 19 * ts }}>
                {settings.familyVoiceLabel ?? "A voice from your family"} — recorded just for you.
              </p>
            )}
            <PixelButton tone="leaf" onClick={finish}>
              Done
            </PixelButton>
          </div>
        )}
      </NineSlicePanel>
    </div>
  );
}
