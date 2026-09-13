import { useEffect, useMemo, useRef, useState } from "react";
import { NineSlicePanel } from "../../components/pixel/NineSlicePanel";
import { PixelButton } from "../../components/pixel/PixelButton";
import { PixelSprite } from "../../components/pixel/PixelSprite";
import { villagerSprite, VILLAGER_PALETTES } from "../../engine/sprites/characters";
import { idleFrame } from "../../engine/world";
import { getNPC } from "../../data/npcs";
import { getDialogueTree, dominantTone, type Tone } from "../../data/dialogue";
import { useSettings } from "../state/SettingsContext";
import { useTelemetry } from "../telemetry/store";
import { speechEngine } from "../speech/SpeechEngine";
import { audioEngine } from "../audio/AudioEngine";

export interface DialogueOverlayProps {
  npcId: string;
  locationId: string;
  onClose: () => void;
}

type Phase = "asking" | "replying" | "ending";

/**
 * A conversation that actually forks. Five beats deep, three replies each, and the
 * reply you pick decides both the answer you get and which version of the next beat
 * you see. No reply is ever wrong and nothing is ever timed — the only thing being
 * tracked is the tone of the conversation, which shapes how it ends.
 */
export function DialogueOverlay({ npcId, locationId, onClose }: DialogueOverlayProps) {
  const { settings } = useSettings();
  const { log } = useTelemetry();
  const npc = getNPC(npcId);
  const tree = getDialogueTree(npcId);
  const pal = VILLAGER_PALETTES[npc.paletteId] ?? VILLAGER_PALETTES.bimal;

  const [nodeId, setNodeId] = useState(tree?.start ?? "");
  const [phase, setPhase] = useState<Phase>("asking");
  const [reply, setReply] = useState<string | null>(null);
  const [beat, setBeat] = useState(1);
  const tallyRef = useRef<Record<Tone, number>>({ warm: 0, curious: 0, quiet: 0 });
  // where the chosen reply leads; applied when the player taps "Go on"
  const pendingNextRef = useRef<string | null>(null);
  const [ending, setEnding] = useState<string | null>(null);

  const node = tree?.nodes[nodeId];
  const ts = settings.textScale;

  const portrait = useMemo(
    () => (t: number) =>
      villagerSprite({
        id: npc.id,
        shape: npc.shape,
        hairStyle: npc.hairStyle,
        frame: idleFrame(t, 1400),
        pal,
      }),
    [npc.id, npc.shape, npc.hairStyle, pal],
  );

  useEffect(() => {
    if (node && phase === "asking") speechEngine.speak(`${npc.name} says. ${node.line}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, phase]);

  useEffect(() => {
    log({ type: "dialogue", npcId, locationId, timestamp: Date.now() });
    return () => speechEngine.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npcId]);

  if (!tree || !node) {
    // no tree authored for this character — fall back to their greeting
    return (
      <div className="absolute inset-0 z-30 flex items-end justify-center p-4 pb-6">
        <NineSlicePanel tone="parchment" className="w-full max-w-2xl rounded-xl p-5 shadow-2xl">
          <p className="font-semibold text-[#3b2a1a]" style={{ fontSize: 20 * ts }}>
            {npc.greeting}
          </p>
          <div className="mt-4 flex justify-end">
            <PixelButton tone="leaf" onClick={onClose}>
              Goodbye
            </PixelButton>
          </div>
        </NineSlicePanel>
      </div>
    );
  }

  function choose(index: number) {
    const choice = node!.choices[index];
    audioEngine.tap();
    tallyRef.current[choice.tone] += 1;
    setReply(choice.reply);
    setPhase("replying");
    speechEngine.speak(choice.reply);
    pendingNextRef.current = choice.next ?? null;
  }

  function advance() {
    const next = pendingNextRef.current;
    setReply(null);
    if (next && tree!.nodes[next]) {
      setNodeId(next);
      setBeat((b) => b + 1);
      setPhase("asking");
    } else {
      const tone = dominantTone(tallyRef.current);
      setEnding(tree!.endings[tone]);
      setPhase("ending");
      audioEngine.confirm();
      speechEngine.speak(tree!.endings[tone]);
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/35 p-4 pb-5 backdrop-blur-[1px]">
      <NineSlicePanel tone="parchment" className="max-h-[92%] w-full max-w-3xl overflow-y-auto rounded-xl p-5 shadow-2xl">
        <div className="flex gap-4">
          <div className="flex shrink-0 flex-col items-center">
            <div className="rounded-lg p-1" style={{ background: "rgba(74,47,30,0.16)" }}>
              <PixelSprite animated scale={4} bitmap={portrait} />
            </div>
            <span className="font-pixel mt-1.5 text-[#3b2a1a]" style={{ fontSize: 8 * ts }}>
              {npc.name}
            </span>
            <span className="text-[#6b563a]" style={{ fontSize: 10.5 * ts }}>
              {npc.role}
            </span>
          </div>

          <div className="flex-1">
            {phase === "ending" ? (
              <>
                <p className="italic leading-snug text-[#5c4529]" style={{ fontSize: 18 * ts }}>
                  {ending}
                </p>
                <div className="mt-5 flex justify-end">
                  <PixelButton tone="leaf" onClick={onClose}>
                    Goodbye
                  </PixelButton>
                </div>
              </>
            ) : phase === "replying" ? (
              <>
                <p className="font-semibold leading-snug text-[#3b2a1a]" style={{ fontSize: 20 * ts }}>
                  {reply}
                </p>
                <div className="mt-5 flex justify-end">
                  <PixelButton tone="amber" onClick={advance}>
                    Go on
                  </PixelButton>
                </div>
              </>
            ) : (
              <>
                <p className="mb-1 text-[#6b563a]" style={{ fontSize: 12 * ts }}>
                  Part {beat} of 5
                </p>
                <p className="mb-4 font-semibold leading-snug text-[#3b2a1a]" style={{ fontSize: 20 * ts }}>
                  {node.line}
                </p>
                <div className="flex flex-col gap-2">
                  {node.choices.map((c, i) => (
                    <button
                      key={c.text}
                      onClick={() => choose(i)}
                      className="rounded-lg px-4 py-3 text-left font-semibold text-[#3b2a1a] transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 active:translate-y-0.5"
                      style={{
                        background: "linear-gradient(#f7eed6,#e7d5ae)",
                        border: "2px solid #8a6238",
                        boxShadow: "0 3px 0 rgba(0,0,0,0.22)",
                        fontSize: 17 * ts,
                      }}
                    >
                      {c.text}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {phase !== "ending" && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={onClose}
              className="text-[#6b563a] underline underline-offset-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
              style={{ fontSize: 13.5 * ts }}
            >
              Step away
            </button>
          </div>
        )}
      </NineSlicePanel>
    </div>
  );
}
