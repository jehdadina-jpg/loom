import type { ReactNode } from "react";
import { parchmentFrameDataUrl, woodFrameDataUrl } from "../../engine/sprites/ui";

export interface NineSlicePanelProps {
  children: ReactNode;
  tone?: "wood" | "parchment";
  className?: string;
  style?: React.CSSProperties;
}

/** Reusable pixel-art frame built from a generated border-image so panels stay crisp at any size. */
export function NineSlicePanel({ children, tone = "parchment", className = "", style }: NineSlicePanelProps) {
  const url = tone === "wood" ? woodFrameDataUrl() : parchmentFrameDataUrl();
  return (
    <div
      className={className}
      style={{
        borderImageSource: `url(${url})`,
        borderImageSlice: "14 fill",
        borderImageWidth: "14px",
        borderImageRepeat: "stretch",
        borderStyle: "solid",
        borderWidth: 14,
        imageRendering: "pixelated",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
