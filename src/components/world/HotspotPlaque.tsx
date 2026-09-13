import { useLayoutEffect, useRef, useState } from "react";
import type { Hotspot } from "../../data/locations/types";
import { iconSprite, iconForLocation, type IconName } from "../../engine/sprites/icons";
import { PixelSprite } from "../pixel/PixelSprite";

function iconFor(h: Hotspot): IconName {
  switch (h.action.type) {
    case "navigate":
      return iconForLocation(h.action.to);
    case "dialogue":
      return "person";
    case "comfort":
      return "rest";
    default:
      return "activity";
  }
}

export interface HotspotPlaqueProps {
  hotspot: Hotspot;
  scale: number;
  stageWidth: number;
  /** Alternating row offset keeps neighbouring plaques from colliding. */
  row: number;
  suggested?: boolean;
  onActivate: (h: Hotspot) => void;
  textScale?: number;
  reducedMotion?: boolean;
}

/**
 * An always-visible nameplate under each landmark. The player can read where a tap leads —
 * and hovering reveals what's there — so nothing on screen is an unlabelled mystery box.
 */
export function HotspotPlaque({
  hotspot,
  scale,
  stageWidth,
  row,
  suggested,
  onActivate,
  textScale = 1,
  reducedMotion = false,
}: HotspotPlaqueProps) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (ref.current) setWidth(ref.current.offsetWidth);
  }, [textScale, scale, hotspot.label]);

  // guard against a not-yet-measured stage so we never emit NaN geometry
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const ts = Number.isFinite(textScale) && textScale > 0 ? textScale : 1;

  const font = Math.round((10 + s * 2) * ts);
  const iconScale = s >= 3 ? 2 : 1;
  const stagePx = stageWidth * s;

  const desiredLeft = (hotspot.x + hotspot.w / 2) * s;
  const half = width / 2;
  const left = width ? Math.min(Math.max(desiredLeft, half + 4), stagePx - half - 4) : desiredLeft;
  const top = (hotspot.y + hotspot.h) * s + row * (font + 14);

  return (
    <div
      ref={ref}
      className="pointer-events-auto absolute flex -translate-x-1/2 flex-col items-center"
      style={{ left, top }}
    >
      <button
        onClick={() => onActivate(hotspot)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={`${hotspot.label}. ${hotspot.description}`}
        className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-lg transition-transform duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 ${
          hovered || suggested ? "-translate-y-0.5" : ""
        } ${suggested && !reducedMotion ? "animate-bob" : ""}`}
        style={{
          padding: `${Math.round(font * 0.3)}px ${Math.round(font * 0.55)}px`,
          background: suggested ? "linear-gradient(#a8772f,#7a5320)" : "linear-gradient(#6d4a2f,#432b1b)",
          border: "2px solid #24160e",
          boxShadow: suggested
            ? "0 0 0 3px rgba(240,200,110,0.9), 0 4px 0 rgba(0,0,0,0.45)"
            : hovered
              ? "0 0 0 2px rgba(240,200,110,0.7), 0 4px 0 rgba(0,0,0,0.45)"
              : "0 3px 0 rgba(0,0,0,0.45)",
        }}
      >
        <PixelSprite bitmap={() => iconSprite(iconFor(hotspot))} scale={iconScale} />
        <span
          className="font-semibold leading-none text-[#f8eed6]"
          style={{ fontSize: font, textShadow: "0 1px 0 rgba(0,0,0,0.65)" }}
        >
          {hotspot.label}
        </span>
      </button>

      {/* description floats above and never affects the row layout */}
      {hovered && (
        <div
          className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1.5"
          style={{
            background: "rgba(24,16,10,0.95)",
            border: "1px solid #6d4a2f",
            color: "#f0e2c4",
            fontSize: Math.max(11, font - 2),
            boxShadow: "0 6px 16px rgba(0,0,0,0.45)",
          }}
        >
          {hotspot.description}
        </div>
      )}
    </div>
  );
}
