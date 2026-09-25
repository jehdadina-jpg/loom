import { useEffect, useMemo, useRef, useState } from "react";
import { WorldCanvas } from "../../components/world/WorldCanvas";
import { GuideBar } from "../../components/world/GuideBar";
import { DialogueOverlay } from "../../game/interactions/DialogueOverlay";
import { ActivityOverlay } from "../../game/interactions/ActivityOverlay";
import { ComfortPanel } from "../../game/interactions/ComfortPanel";
import { buildLocation, todaySeed } from "../../data/locations";
import { getPack } from "../../data/community/packs";
import { getActivity } from "../../data/activities";
import { useTelemetry } from "../../game/telemetry/store";
import { useSettings } from "../../game/state/SettingsContext";
import { useSession } from "../../game/session/SessionContext";
import { audioEngine } from "../../game/audio/AudioEngine";
import { speechEngine } from "../../game/speech/SpeechEngine";
import type { EasterEgg, Hotspot, LocationId } from "../../data/locations/types";
import { ChapterCard } from "../../components/story/ChapterCard";
import { ReminderCard } from "../../game/reminders/ReminderCard";
import { chapterForGuideIndex } from "../../data/story";
import { PixelSprite } from "../../components/pixel/PixelSprite";
import { DiscoveryBadge } from "../../components/world/DiscoveryBadge";
import { iconSprite, type IconName } from "../../engine/sprites/icons";
import type { TimeMode } from "../../engine/fx/DayNight";
import { TOTAL_EASTER_EGGS } from "../../data/locations/easterEggs";
import { GameHud } from "../../components/shared/GameHud";

export interface PlayRouteProps {
  onRequestCaregiver: () => void;
}

const CORNER_HOLD_MS = 2000;

/** Tapping the sky button walks through these — the whole village changes with it. */
const TIME_CYCLE: { mode: TimeMode; icon: IconName; label: string }[] = [
  { mode: "cycle", icon: "cycle", label: "Day passing" },
  { mode: "fixed-day", icon: "sun", label: "Daytime" },
  { mode: "fixed-golden", icon: "sun", label: "Golden hour" },
  { mode: "fixed-night", icon: "moon", label: "Night" },
];

export function PlayRoute({ onRequestCaregiver }: PlayRouteProps) {
  const { settings, update } = useSettings();
  const session = useSession();
  const { log } = useTelemetry();

  // A caregiver hand-over opens straight onto its activity. Nothing about the time of day
  // is checked here — the caregiver has already decided.
  const [launch] = useState(() => session.launch);
  const [locationId, setLocationId] = useState<LocationId>(launch?.locationId ?? session.lastLocation ?? "path");
  const [dialogueNpc, setDialogueNpc] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(launch?.activityId ?? null);
  const openSessionRef = useRef<string | null>(launch?.sessionId ?? null);
  const [comfortOpen, setComfortOpen] = useState(false);
  const [toast, setToast] = useState<{ id: string; line: string } | null>(null);
  const [timeLabel, setTimeLabel] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const timeLabelTimer = useRef<number | null>(null);

  const missesRef = useRef(0);
  const navStartRef = useRef(Date.now());
  const holdTimer = useRef<number | null>(null);
  // a brief black wipe between places, so travelling through the village feels like a
  // scene change rather than an instant teleport
  const [wiping, setWiping] = useState(false);

  const pack = useMemo(() => getPack(settings.communityPackId), [settings.communityPackId]);
  const seed = useMemo(() => todaySeed(), []);
  const scene = useMemo(
    () => buildLocation(locationId, pack, seed, session.rotation),
    [locationId, pack, seed, session.rotation],
  );

  // ambient soundscape follows the place you're standing in
  useEffect(() => {
    audioEngine.setEnabled(settings.audioEnabled);
  }, [settings.audioEnabled]);

  useEffect(() => {
    if (settings.audioEnabled) audioEngine.setAmbience(scene.ambience ?? "village");
  }, [scene.ambience, settings.audioEnabled]);

  useEffect(() => {
    const unlock = () => audioEngine.resume();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    if (launch) session.clearLaunch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeActivity() {
    if (openSessionRef.current) {
      log({ type: "session_end", sessionId: openSessionRef.current, timestamp: Date.now() });
      openSessionRef.current = null;
    }
    setActivityId(null);
  }

  useEffect(() => {
    session.setLastLocation(locationId);
    session.noteArrival(locationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  function navigateTo(to: LocationId) {
    log({
      type: "navigate",
      to,
      misses: missesRef.current,
      elapsedMs: Date.now() - navStartRef.current,
      timestamp: Date.now(),
    });
    missesRef.current = 0;
    navStartRef.current = Date.now();
    audioEngine.tap();
    setWiping(true);
    window.setTimeout(() => {
      setLocationId(to);
      setDialogueNpc(null);
      window.setTimeout(() => setWiping(false), 40);
    }, 160);
  }

  function handleHotspot(h: Hotspot) {
    const a = h.action;
    if (a.type === "navigate") navigateTo(a.to);
    else if (a.type === "dialogue") {
      audioEngine.tap();
      setDialogueNpc(a.npcId);
    } else if (a.type === "activity") {
      audioEngine.tap();
      setActivityId(a.activityId);
    } else if (a.type === "comfort") {
      audioEngine.tap();
      setComfortOpen(true);
    }
  }

  function handleEasterEgg(egg: EasterEgg) {
    const isNew = !session.foundEggs.includes(egg.id);
    session.noteEggFound(egg.id);
    if (isNew && egg.sound === "confirm") audioEngine.confirm();
    else audioEngine.tap();
    if (isNew) speechEngine.speak(egg.line);
    setToast({ id: `${egg.id}-${Date.now()}`, line: isNew ? egg.line : "A familiar little delight, right where you left it." });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  }

  function cycleTime() {
    const idx = TIME_CYCLE.findIndex((t) => t.mode === settings.timeMode);
    const next = TIME_CYCLE[(idx + 1) % TIME_CYCLE.length];
    update({ timeMode: next.mode });
    audioEngine.tap();
    setTimeLabel(next.label);
    if (timeLabelTimer.current) window.clearTimeout(timeLabelTimer.current);
    timeLabelTimer.current = window.setTimeout(() => setTimeLabel(null), 1800);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      if (timeLabelTimer.current) window.clearTimeout(timeLabelTimer.current);
    };
  }, []);

  function startCornerHold() {
    holdTimer.current = window.setTimeout(onRequestCaregiver, CORNER_HOLD_MS);
  }
  function cancelCornerHold() {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  const activity = activityId ? getActivity(activityId) : undefined;
  const overlayOpen = !!activity || comfortOpen || !!dialogueNpc;

  // story mode: once per chapter, a title card frames what's about to happen —
  // purely narrative, it never gates or blocks the guide banner underneath it
  const currentChapter = settings.guideMode ? chapterForGuideIndex(session.guideIndex) : null;
  const chapterCard = currentChapter && !session.seenChapters.includes(currentChapter.id) && !overlayOpen ? currentChapter : null;

  // the guide only ever points at one thing, never while something else is on screen,
  // and never in a place whose whole purpose is to have nothing to do
  const guideStep = settings.guideMode && !overlayOpen && !scene.noGuide ? session.guideStep : null;
  const currentTime = TIME_CYCLE.find((t) => t.mode === settings.timeMode) ?? TIME_CYCLE[0];
  const guideHere = guideStep?.locationId === locationId;
  const suggestedHotspotId = guideHere ? guideStep!.hotspotId : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0e1a12]">
      <GameHud onSettings={onRequestCaregiver} textScale={settings.textScale} />
      <div
        className={`pointer-events-none absolute inset-0 z-[60] bg-black transition-opacity duration-200 ${
          wiping ? "opacity-100" : "opacity-0"
        }`}
      />
      {chapterCard && (
        <ChapterCard
          chapter={chapterCard}
          narrationEnabled={settings.narration}
          textScale={settings.textScale}
          onContinue={() => session.markChapterSeen(chapterCard.id)}
        />
      )}
      <WorldCanvas
        scene={scene}
        onHotspot={handleHotspot}
        onMiss={() => (missesRef.current += 1)}
        onEasterEgg={handleEasterEgg}
        discoveredEggIds={session.foundEggs}
        onBack={scene.backTo ? () => navigateTo(scene.backTo!) : undefined}
        suggestedHotspotId={suggestedHotspotId}
        textScale={settings.textScale}
        highContrast={settings.highContrast}
        reducedMotion={settings.reducedMotion}
        timeMode={settings.timeMode}
        weather={settings.weather}
        topHud={
          guideStep ? (
            <GuideBar
              prompt={guideStep.prompt}
              targetLocation={guideStep.locationId}
              hereAlready={guideHere}
              onGo={() => navigateTo(guideStep.locationId)}
              textScale={settings.textScale}
            />
          ) : null
        }
      />

      {!overlayOpen && !chapterCard && (
        <DiscoveryBadge found={session.foundEggs.length} total={TOTAL_EASTER_EGGS} textScale={settings.textScale} />
      )}

      {!scene.backTo && (
        <div
          className="font-pixel pointer-events-none absolute left-4 top-4 rounded-lg px-3 py-2 text-parchment shadow-lg"
          style={{ background: "rgba(20,14,9,0.72)", fontSize: 10 * settings.textScale }}
        >
          LOOM
        </div>
      )}

      {scene.ambientNote && (
        <div
          className="pointer-events-none absolute bottom-4 left-4 max-w-[260px] rounded-lg px-3 py-2 text-parchment/95 shadow-lg"
          style={{ background: "rgba(20,14,9,0.65)", fontSize: 12.5 * settings.textScale }}
        >
          {scene.ambientNote}
        </div>
      )}

      {/* the sky control: one tap moves the whole village between day, golden hour and night */}
      <div className="absolute right-20 top-4 flex flex-col items-end gap-1">
        <button
          onClick={cycleTime}
          aria-label={`Change the time of day. Currently ${currentTime.label}`}
          className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-[#f7ecd2] transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 active:translate-y-0.5"
          style={{
            background: "linear-gradient(#6d4a2f,#43291a)",
            border: "2px solid #2e1c13",
            boxShadow: "0 3px 0 rgba(0,0,0,0.4), 0 6px 14px rgba(0,0,0,0.35)",
          }}
        >
          <PixelSprite bitmap={() => iconSprite(currentTime.icon)} scale={1} />
        </button>
        {timeLabel && (
          <span
            className="animate-toast-in rounded-md px-2 py-1 text-parchment shadow-lg"
            style={{ background: "rgba(20,14,9,0.8)", fontSize: 12 * settings.textScale }}
          >
            {timeLabel}
          </span>
        )}
      </div>

      {/* a found delight says its one warm line, then gets out of the way */}
      {toast && (
        <div key={toast.id} className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 px-4">
          <div
            className="animate-toast-in rounded-xl px-4 py-2.5 text-center shadow-2xl"
            style={{
              background: "linear-gradient(#f3e3c3,#e0c896)",
              border: "2px solid #4a2f1e",
              maxWidth: 420,
            }}
          >
            <span className="font-semibold text-[#3b2a1a]" style={{ fontSize: 15 * settings.textScale }}>
              {toast.line}
            </span>
          </div>
        </div>
      )}

      {/* hidden caregiver entry: press and hold the top-right corner for two seconds */}
      <div
        className="absolute right-0 top-0 h-16 w-16"
        onPointerDown={startCornerHold}
        onPointerUp={cancelCornerHold}
        onPointerLeave={cancelCornerHold}
        aria-hidden
      />

      {/* a reminder waits for whatever is open to finish, so it never lands on top of something */}
      {!overlayOpen && !chapterCard && (
        <ReminderCard textScale={settings.textScale} reducedMotion={settings.reducedMotion} />
      )}

      {dialogueNpc && (
        <div key={dialogueNpc} className="absolute inset-0 z-40 animate-crossfade">
          <DialogueOverlay npcId={dialogueNpc} locationId={locationId} onClose={() => setDialogueNpc(null)} />
        </div>
      )}

      {activity && (
        <div key={activity.id} className="absolute inset-0 z-40 animate-crossfade">
          <ActivityOverlay
            activity={activity}
            locationId={locationId}
            onClose={closeActivity}
            onComplete={closeActivity}
          />
        </div>
      )}

      {comfortOpen && (
        <div className="absolute inset-0 z-40 animate-crossfade">
          <ComfortPanel locationId={locationId} onClose={() => setComfortOpen(false)} />
        </div>
      )}
    </div>
  );
}
