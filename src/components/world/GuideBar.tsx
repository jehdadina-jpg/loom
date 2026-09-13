import { PixelSprite } from "../pixel/PixelSprite";
import { iconSprite, iconForLocation } from "../../engine/sprites/icons";
import type { LocationId } from "../../data/locations/types";

export interface GuideBarProps {
  prompt: string;
  /** Where the suggestion lives, so the player can be pointed there if they've wandered. */
  targetLocation: LocationId;
  hereAlready: boolean;
  onGo?: () => void;
  textScale?: number;
}

/**
 * A single, calm suggestion of what to do next. Never a task list, never a timer —
 * it only ever names one gentle next step, and it's always optional.
 */
export function GuideBar({ prompt, targetLocation, hereAlready, onGo, textScale = 1 }: GuideBarProps) {
  return (
    <div className="pointer-events-auto animate-panel-in">
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{
          background: "linear-gradient(#f3e3c3,#e3cb9f)",
          border: "2px solid #4a2f1e",
          boxShadow: "0 4px 0 rgba(0,0,0,0.3), 0 10px 22px rgba(0,0,0,0.35)",
        }}
      >
        <PixelSprite bitmap={() => iconSprite(iconForLocation(targetLocation))} scale={2} />
        <span key={prompt} className="animate-crossfade font-semibold text-[#3b2a1a]" style={{ fontSize: 15.5 * textScale }}>
          {prompt}
        </span>
        {!hereAlready && onGo && (
          <button
            onClick={onGo}
            className="rounded-lg px-4 py-2 font-bold text-[#f7ecd2] transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 active:translate-y-0.5"
            style={{
              background: "linear-gradient(#3f7d40,#2c5c2e)",
              border: "2px solid #1b4022",
              boxShadow: "0 3px 0 rgba(0,0,0,0.35)",
              fontSize: 14.5 * textScale,
            }}
          >
            Take me there
          </button>
        )}
      </div>
    </div>
  );
}
