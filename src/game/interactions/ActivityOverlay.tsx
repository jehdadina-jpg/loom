import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityDef, ActivityOption } from "../../data/activities";
import { NineSlicePanel } from "../../components/pixel/NineSlicePanel";
import { PixelButton } from "../../components/pixel/PixelButton";
import { PixelSprite } from "../../components/pixel/PixelSprite";
import { numberCard } from "../../engine/sprites/props";
import { useTelemetry } from "../telemetry/store";
import { profileForDomain } from "../adapt/difficulty";
import { speechEngine } from "../speech/SpeechEngine";
import { useSettings } from "../state/SettingsContext";
import { useSession } from "../session/SessionContext";
import { audioEngine } from "../audio/AudioEngine";

export interface ActivityOverlayProps {
  activity: ActivityDef;
  locationId: string;
  onComplete: () => void;
  onClose: () => void;
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Idle time before the cue ladder offers a little more help on its own. */
const IDLE_CUE_MS = 9000;

/** Cue-ladder tile: escalates help (glow -> lift -> label -> pointer) without ever signalling failure. */
function CueTile({
  option,
  isTarget,
  cueLevel,
  done,
  textScale,
  reducedMotion,
  onTap,
}: {
  option: ActivityOption;
  isTarget: boolean;
  cueLevel: number;
  done: boolean;
  textScale: number;
  reducedMotion: boolean;
  onTap: () => void;
}) {
  const showGlow = isTarget && cueLevel >= 1 && !done;
  const showLift = isTarget && cueLevel >= 2 && !done;
  const showLabel = isTarget && cueLevel >= 3;
  const showPointer = isTarget && cueLevel >= 4 && !done;

  return (
    <div className="relative flex flex-col items-center gap-1.5">
      {showPointer && (
        <div
          className={`absolute -top-7 text-2xl text-amber-500 ${reducedMotion ? "" : "animate-bounce"}`}
          style={{ textShadow: "0 2px 0 rgba(0,0,0,0.35)" }}
          aria-hidden
        >
          ▼
        </div>
      )}
      <button
        onClick={onTap}
        disabled={done}
        aria-label={option.label}
        className={`relative flex h-20 w-20 items-center justify-center rounded-2xl p-1.5 transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 active:scale-95 sm:h-24 sm:w-24 lg:h-28 lg:w-28 ${
          showLift && !reducedMotion ? "-translate-y-1" : ""
        }`}
        style={{
          background: done && isTarget ? "linear-gradient(#dff0d8,#bfe0b4)" : "linear-gradient(#fbf1da,#ecdcba)",
          border: `4px solid ${done && isTarget ? "#3f7d40" : showGlow ? "#d9a33a" : "#6d4a2f"}`,
          boxShadow: showGlow
            ? "0 0 0 8px rgba(224,168,53,0.75), 0 0 22px 6px rgba(224,168,53,0.5), 0 6px 0 rgba(0,0,0,0.25)"
            : "0 5px 0 rgba(0,0,0,0.25)",
        }}
      >
        <PixelSprite bitmap={option.render} scale={3} />
        {done && isTarget && (
          <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#3f7d40] text-base text-white shadow-lg">
            ✓
          </span>
        )}
      </button>
      <span
        className={`h-4 text-center font-semibold leading-tight text-[#3b2a1a] transition-opacity ${showLabel ? "opacity-100" : "opacity-0"}`}
        style={{ fontSize: 13 * textScale }}
      >
        {option.label}
      </span>
    </div>
  );
}

/** Face-down pairs. A mismatch simply turns back over — there is no penalty and no timer. */
function PairsBoard({
  cards,
  matched,
  flipped,
  hintIds,
  reducedMotion,
  onFlip,
}: {
  cards: { key: string; option: ActivityOption }[];
  matched: Set<string>;
  flipped: string[];
  hintIds: string[];
  reducedMotion: boolean;
  onFlip: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 justify-items-center gap-3 sm:grid-cols-4">
      {cards.map(({ key, option }) => {
        const isUp = flipped.includes(key) || matched.has(option.id);
        const isMatched = matched.has(option.id);
        const hinted = hintIds.includes(key) && !isUp;
        return (
          <button
            key={key}
            onClick={() => onFlip(key)}
            aria-label={isUp ? option.label : "Face-down card"}
            className={`flex h-[72px] w-[72px] items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 active:scale-95 sm:h-20 sm:w-20 ${
              hinted && !reducedMotion ? "animate-bob" : ""
            }`}
            style={{
              background: isMatched
                ? "linear-gradient(#dff0d8,#bfe0b4)"
                : isUp
                  ? "linear-gradient(#fbf1da,#ecdcba)"
                  : "linear-gradient(#8a6238,#5d3f26)",
              border: `3px solid ${isMatched ? "#3f7d40" : hinted ? "#d9a33a" : "#4a2f1e"}`,
              boxShadow: hinted ? "0 0 0 6px rgba(224,168,53,0.6)" : "0 4px 0 rgba(0,0,0,0.28)",
            }}
          >
            {isUp ? (
              <PixelSprite bitmap={option.render} scale={3} />
            ) : (
              <span className="text-2xl text-[#e6cfa4]" aria-hidden>
                ?
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ActivityOverlay({ activity, locationId, onComplete, onClose }: ActivityOverlayProps) {
  const { log, events } = useTelemetry();
  const { settings } = useSettings();
  const { addMemory, noteActivityComplete } = useSession();

  // How much support this domain has needed lately decides how many choices appear
  // and whether the first cue is already showing when the activity opens.
  const profile = useMemo(
    () => (settings.adaptiveDifficulty ? profileForDomain(events, activity.domain) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activity.id, settings.adaptiveDifficulty],
  );

  const [cueLevel, setCueLevel] = useState(profile?.startingCue ?? 0);
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [stepIndex, setStepIndex] = useState(0);
  const maxCueRef = useRef(0);
  const lastInteractionRef = useRef(Date.now());

  // pairs state
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const flipTimer = useRef<number | null>(null);

  const isSequence = activity.kind === "sequence";
  const isPairs = activity.kind === "pairs";
  const isCount = activity.kind === "count";

  const items = useMemo<ActivityOption[]>(() => {
    if (isSequence) return shuffled(activity.steps ?? []);
    if (isCount && activity.count) {
      const c = activity.count;
      return shuffled(
        c.choices.map((n) => ({
          id: `n${n}`,
          label: String(n),
          render: () => numberCard(n),
          correct: n === c.answer,
        })),
      );
    }
    const options = activity.options ?? [];
    const want = profile?.choiceCount ?? 4;
    const correct = options.filter((o) => o.correct);
    const distractors = shuffled(options.filter((o) => !o.correct)).slice(0, Math.max(1, want - correct.length));
    return shuffled([...correct, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id, profile?.choiceCount]);

  const cards = useMemo(() => {
    if (!isPairs) return [];
    const pool = activity.pairs ?? [];
    const limited = pool.slice(0, profile?.level === "gentle" ? 3 : pool.length);
    return shuffled(
      limited.flatMap((o) => [
        { key: `${o.id}-a`, option: o },
        { key: `${o.id}-b`, option: o },
      ]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id, profile?.level]);

  useEffect(() => {
    log({ type: "activity_start", activityId: activity.id, domain: activity.domain, timestamp: Date.now() });
    speechEngine.speak(activity.prompt);
    return () => {
      speechEngine.stop();
      if (flipTimer.current) window.clearTimeout(flipTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id]);

  // If nothing happens for a while, quietly raise the cue level. Hesitation deserves
  // more help just as much as a mis-tap does — and neither is treated as a mistake.
  useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(() => {
      if (Date.now() - lastInteractionRef.current >= IDLE_CUE_MS) {
        lastInteractionRef.current = Date.now();
        setCueLevel((c) => {
          const next = Math.min(4, c + 1);
          maxCueRef.current = Math.max(maxCueRef.current, next);
          return next;
        });
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [finished]);

  function bumpCue() {
    lastInteractionRef.current = Date.now();
    setAttempts((a) => a + 1);
    setCueLevel((c) => {
      const next = Math.min(4, c + 1);
      maxCueRef.current = Math.max(maxCueRef.current, next);
      return next;
    });
  }

  function finish() {
    setFinished(true);
    audioEngine.confirm();
    speechEngine.speak(activity.successLine);
    log({
      type: "activity_complete",
      activityId: activity.id,
      domain: activity.domain,
      attempts: attempts + 1,
      cueLevelReached: maxCueRef.current,
      elapsedMs: Date.now() - startTime,
      timestamp: Date.now(),
    });
    addMemory({ title: activity.title, note: activity.memoryNote, locationId });
    noteActivityComplete(activity.id);
  }

  function handleChoiceTap(opt: ActivityOption) {
    if (finished) return;
    const correct = !!opt.correct;
    log({ type: "activity_attempt", activityId: activity.id, correct, cueLevel, timestamp: Date.now() });
    if (correct) finish();
    else {
      audioEngine.tap();
      bumpCue();
    }
  }

  function handleSequenceTap(opt: ActivityOption) {
    if (finished) return;
    const expected = activity.steps![stepIndex];
    const correct = opt.id === expected.id;
    log({ type: "activity_attempt", activityId: activity.id, correct, cueLevel, timestamp: Date.now() });
    if (correct) {
      const next = stepIndex + 1;
      if (next >= activity.steps!.length) finish();
      else {
        audioEngine.tap();
        lastInteractionRef.current = Date.now();
        setStepIndex(next);
        setCueLevel(profile?.startingCue ?? 0);
        speechEngine.speak(`Next, ${activity.steps![next].label}`);
      }
    } else {
      audioEngine.tap();
      bumpCue();
    }
  }

  function handleFlip(key: string) {
    if (finished || flipped.length >= 2) return;
    const card = cards.find((c) => c.key === key);
    if (!card || matched.has(card.option.id) || flipped.includes(key)) return;

    const next = [...flipped, key];
    setFlipped(next);
    audioEngine.tap();
    lastInteractionRef.current = Date.now();

    if (next.length === 2) {
      const [a, b] = next.map((k) => cards.find((c) => c.key === k)!);
      const isMatch = a.option.id === b.option.id;
      log({ type: "activity_attempt", activityId: activity.id, correct: isMatch, cueLevel, timestamp: Date.now() });

      flipTimer.current = window.setTimeout(
        () => {
          setFlipped([]);
          if (isMatch) {
            const nowMatched = new Set(matched);
            nowMatched.add(a.option.id);
            setMatched(nowMatched);
            const total = new Set(cards.map((c) => c.option.id)).size;
            if (nowMatched.size >= total) finish();
            else audioEngine.confirm();
          } else {
            bumpCue();
          }
        },
        isMatch ? 550 : 950,
      );
    }
  }

  const ts = settings.textScale;
  const targetId = isSequence ? activity.steps![stepIndex]?.id : items.find((o) => o.correct)?.id;

  // at high cue levels, gently show where a matching pair lives
  const hintIds = useMemo(() => {
    if (!isPairs || cueLevel < 3) return [];
    const unmatched = cards.filter((c) => !matched.has(c.option.id));
    const first = unmatched[0];
    if (!first) return [];
    return unmatched.filter((c) => c.option.id === first.option.id).map((c) => c.key);
  }, [isPairs, cueLevel, cards, matched]);

  const totalPairs = isPairs ? new Set(cards.map((c) => c.option.id)).size : 0;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <NineSlicePanel tone="parchment" className="max-h-[94%] w-full max-w-3xl overflow-y-auto rounded-xl p-5 shadow-2xl">
        {!finished ? (
          <>
            <h2 className="font-pixel mb-2 text-[#3b2a1a]" style={{ fontSize: 13 * ts }}>
              {activity.title}
            </h2>
            <p className="mb-3 font-semibold text-[#3b2a1a]" style={{ fontSize: 20 * ts }}>
              {activity.prompt}
            </p>

            {isSequence && (
              <p className="mb-3 text-[#6b563a]" style={{ fontSize: 14 * ts }}>
                Step {stepIndex + 1} of {activity.steps!.length}
              </p>
            )}
            {isPairs && (
              <p className="mb-3 text-[#6b563a]" style={{ fontSize: 14 * ts }}>
                {matched.size} of {totalPairs} pairs found
              </p>
            )}

            {/* counting activities show the things to be counted, laid out plainly */}
            {isCount && activity.count && (
              <div
                className="mb-4 flex flex-wrap items-center justify-center gap-3 rounded-xl p-4"
                style={{ background: "rgba(120,85,45,0.12)", border: "2px solid #c2a878" }}
              >
                {Array.from({ length: activity.count.answer }).map((_, i) => (
                  <PixelSprite key={i} bitmap={activity.count!.icon} scale={3} />
                ))}
              </div>
            )}

            {isPairs ? (
              <PairsBoard
                cards={cards}
                matched={matched}
                flipped={flipped}
                hintIds={hintIds}
                reducedMotion={settings.reducedMotion}
                onFlip={handleFlip}
              />
            ) : (
              <div className="flex flex-nowrap items-start justify-center gap-3 sm:gap-4">
                {items.slice(0, 4).map((opt) => (
                  <CueTile
                    key={opt.id}
                    option={opt}
                    isTarget={opt.id === targetId}
                    cueLevel={cueLevel}
                    textScale={ts}
                    reducedMotion={settings.reducedMotion}
                    done={isSequence ? activity.steps!.findIndex((s) => s.id === opt.id) < stepIndex : false}
                    onTap={() => (isSequence ? handleSequenceTap(opt) : handleChoiceTap(opt))}
                  />
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-center">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-[#6b563a] underline underline-offset-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
                style={{ fontSize: 14 * ts }}
              >
                Maybe later
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3f7d40] text-3xl text-white shadow-lg">
              ✓
            </div>
            <p className="font-bold text-[#3b2a1a]" style={{ fontSize: 21 * ts }}>
              {activity.successLine}
            </p>
            <p className="max-w-md text-[#6b563a]" style={{ fontSize: 14 * ts }}>
              Saved to your album: {activity.memoryNote}
            </p>
            <PixelButton onClick={onComplete} tone="leaf" size="lg">
              Continue
            </PixelButton>
          </div>
        )}
      </NineSlicePanel>
    </div>
  );
}
