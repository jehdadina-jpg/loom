import { useEffect, useMemo, useState } from "react";
import { WorldCanvas } from "../../components/world/WorldCanvas";
import { PixelSprite } from "../../components/pixel/PixelSprite";
import { loomLogo, loomMark } from "../../engine/sprites/logo";
import { preloadAssets } from "../../engine/preload";
import { buildLocation, todaySeed } from "../../data/locations";
import { getPack } from "../../data/community/packs";
import { useSettings } from "../../game/state/SettingsContext";
import { useSession } from "../../game/session/SessionContext";
import { useProfile } from "../../game/profiles/ProfileContext";
import { audioEngine } from "../../game/audio/AudioEngine";

export interface TitleScreenProps {
  onPlay: () => void;
  onContinue: () => void;
  onCaregiver: () => void;
}

const PLACE_NAMES: Record<string, string> = {
  path: "the village",
  home: "home",
  market: "the market",
  veranda: "the veranda",
  waterpoint: "the water point",
  field: "the field",
  community: "the community area",
  garden: "the garden",
};

/**
 * The way in: the living village plays behind a carved wooden wordmark while every
 * sprite in the game is rasterised in the background. Only one button really matters,
 * and it's the biggest thing on screen.
 */
export function TitleScreen({ onPlay, onContinue, onCaregiver }: TitleScreenProps) {
  const { settings } = useSettings();
  const { lastLocation, guideIndex } = useSession();
  const { active } = useProfile();

  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("Waking the village");
  const [ready, setReady] = useState(false);

  const pack = useMemo(() => getPack(settings.communityPackId), [settings.communityPackId]);
  const scene = useMemo(() => buildLocation("path", pack, todaySeed()), [pack]);

  useEffect(() => {
    let alive = true;
    void preloadAssets((f, l) => {
      if (!alive) return;
      setProgress(f);
      setLabel(l);
    }).then(() => {
      if (!alive) return;
      setProgress(1);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const hasProgress = guideIndex > 0 || lastLocation !== "path";
  const ts = settings.textScale;

  function start(fn: () => void) {
    audioEngine.resume();
    audioEngine.tap();
    fn();
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b140e]">
      <div className="absolute inset-0">
        <WorldCanvas
          scene={scene}
          chromeless
          onHotspot={() => {}}
          timeMode={settings.timeMode}
          weather={settings.weather}
          reducedMotion={settings.reducedMotion}
          highContrast={settings.highContrast}
        />
      </div>

      {/* the world is beautiful but the words have to win — a soft scrim buys contrast */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 38%, rgba(8,14,10,0.15) 0%, rgba(8,14,10,0.55) 45%, rgba(8,14,10,0.82) 100%)",
        }}
      />

      <div
        className="relative flex h-full w-full flex-col items-center justify-center px-6"
        style={{ paddingBottom: 44 * ts }}
      >
        <div className={settings.reducedMotion ? "" : "animate-bob"}>
          <PixelSprite bitmap={loomLogo} scale={2} className="drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]" />
        </div>

        <p
          className="mt-4 font-semibold tracking-wide text-[#f2e3c4] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
          style={{ fontSize: 17 * ts }}
        >
          A village to visit together
        </p>

        <div className="mt-7 flex w-full max-w-xs flex-col items-center gap-3">
          {!ready ? (
            <div className="w-full">
              <div
                className="h-6 w-full overflow-hidden rounded-md"
                style={{ background: "rgba(12,9,6,0.75)", border: "2px solid #2e1c13" }}
              >
                <div
                  className="h-full transition-[width] duration-200"
                  style={{
                    width: `${Math.round(progress * 100)}%`,
                    background: "repeating-linear-gradient(90deg,#d9a34e 0 6px,#bb8438 6px 12px)",
                  }}
                />
              </div>
              <p
                className="mt-2 text-center text-[#e4d3b0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                style={{ fontSize: 13 * ts }}
              >
                {label}…
              </p>
            </div>
          ) : (
            <>
              <TitleButton label={hasProgress ? "Continue" : "Start"} primary onClick={() => start(onPlay)} ts={ts} />
              {hasProgress && (
                <TitleButton
                  label={`Start again at ${PLACE_NAMES.path}`}
                  onClick={() => start(onContinue)}
                  ts={ts}
                />
              )}
              {hasProgress && (
                <p className="text-[#cdbc9a] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{ fontSize: 13 * ts }}>
                  Last visit ended at {PLACE_NAMES[lastLocation] ?? "the village"}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* quiet corner chrome: who this is for, and the carer's way in */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <PixelSprite bitmap={loomMark} scale={1} />
        <span className="text-[#c9b894] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{ fontSize: 12 * ts }}>
          {active.name}
        </span>
      </div>

      <button
        onClick={() => start(onCaregiver)}
        className="absolute bottom-4 right-4 rounded-lg px-3 py-2 text-[#c9b894] transition-colors hover:text-[#f2e3c4] focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
        style={{ background: "rgba(12,9,6,0.6)", border: "1px solid #3c2a1c", fontSize: 12.5 * ts }}
      >
        Carer setup
      </button>
    </div>
  );
}

function TitleButton({
  label,
  onClick,
  primary,
  ts,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  ts: number;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full rounded-xl font-bold text-[#f8eed6] transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 active:translate-y-1"
      style={{
        padding: primary ? "14px 24px" : "10px 18px",
        fontSize: (primary ? 20 : 14) * ts,
        background: primary ? "linear-gradient(#4e9b4b,#2f6b33)" : "linear-gradient(#6d4a2f,#43291a)",
        border: "3px solid #1c1109",
        boxShadow: primary
          ? "0 6px 0 #1d4a22, 0 12px 24px rgba(0,0,0,0.5)"
          : "0 4px 0 #2a1a10, 0 8px 18px rgba(0,0,0,0.45)",
        textShadow: "0 2px 0 rgba(0,0,0,0.45)",
      }}
    >
      <span className="pointer-events-none absolute inset-x-3 top-1.5 h-1/3 rounded-t-lg bg-white/15" />
      <span className="relative">{label}</span>
    </button>
  );
}
