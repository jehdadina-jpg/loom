import { NineSlicePanel } from "./NineSlicePanel";
import { PixelSprite } from "./PixelSprite";
import { villagerSprite, VILLAGER_PALETTES } from "../../engine/sprites/characters";
import { idleFrame } from "../../engine/world";
import { getNPC } from "../../data/npcs";

export interface SpeechBubbleProps {
  npcId?: string;
  text: string;
  textScale?: number;
  onClose?: () => void;
}

/** Game-style dialogue: portrait, name, large legible line, one obvious way to close it. */
export function SpeechBubble({ npcId, text, textScale = 1, onClose }: SpeechBubbleProps) {
  const npc = npcId ? getNPC(npcId) : null;
  const pal = npc ? VILLAGER_PALETTES[npc.paletteId] ?? VILLAGER_PALETTES.bimal : null;

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
      <NineSlicePanel tone="parchment" className="flex max-w-2xl items-center gap-4 rounded-lg p-4 shadow-2xl">
        {npc && pal && (
          <div className="flex shrink-0 flex-col items-center">
            <div className="rounded-lg p-1" style={{ background: "rgba(74,47,30,0.16)" }}>
              <PixelSprite
                animated
                scale={4}
                bitmap={(t) =>
                  villagerSprite({
                    id: npc.id,
                    shape: npc.shape,
                    hairStyle: npc.hairStyle,
                    frame: idleFrame(t, 1400),
                    pal,
                  })
                }
              />
            </div>
            <span className="font-pixel mt-1.5 text-[#3b2a1a]" style={{ fontSize: 9 * textScale }}>
              {npc.name}
            </span>
            <span className="text-[#6b563a]" style={{ fontSize: 11 * textScale }}>
              {npc.role}
            </span>
          </div>
        )}
        <p className="flex-1 font-semibold leading-snug text-[#3b2a1a]" style={{ fontSize: 21 * textScale }}>
          {text}
        </p>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-2 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl text-[#f7ecd2] transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 active:translate-y-0.5"
            style={{
              background: "linear-gradient(#3f7d40,#2c5c2e)",
              border: "2px solid #1b4022",
              boxShadow: "0 4px 0 rgba(0,0,0,0.35)",
            }}
          >
            ✓
          </button>
        )}
      </NineSlicePanel>
    </div>
  );
}
