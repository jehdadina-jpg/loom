import { useEffect, useRef, useState } from "react";

export const STAGE_W = 512;
export const STAGE_H = 288;

export interface StageLayout {
  /** Canvas offset within the stage container, in CSS pixels. */
  left: number;
  top: number;
  /** Integer upscale factor from logical pixels to CSS pixels. */
  scale: number;
}

export interface PixelStageProps {
  onFrame: (ctx: CanvasRenderingContext2D, time: number, dims: { w: number; h: number }) => void;
  width?: number;
  height?: number;
  className?: string;
  onPointerDown?: (pos: { x: number; y: number }) => void;
  onLayout?: (layout: StageLayout) => void;
  /** Rendered above the canvas, positioned by the caller using the reported layout. */
  overlay?: React.ReactNode;
}

/**
 * Hosts the logical-resolution pixel canvas and integer-scales it to fill its container,
 * keeping every art-pixel crisp (nearest-neighbor, no fractional scaling).
 */
export function PixelStage({
  onFrame,
  width = STAGE_W,
  height = STAGE_H,
  className,
  onPointerDown,
  onLayout,
  overlay,
}: PixelStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(onFrame);
  frameRef.current = onFrame;
  const layoutRef = useRef(onLayout);
  layoutRef.current = onLayout;

  const [layout, setLayout] = useState<StageLayout>({ left: 0, top: 0, scale: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    function applyScale() {
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const scale = Math.max(1, Math.floor(Math.min(rect.width / width, rect.height / height)));
      canvas.style.width = `${width * scale}px`;
      canvas.style.height = `${height * scale}px`;
      const next = {
        left: Math.round((rect.width - width * scale) / 2),
        top: Math.round((rect.height - height * scale) / 2),
        scale,
      };
      setLayout(next);
      layoutRef.current?.(next);
    }

    const ro = new ResizeObserver(applyScale);
    ro.observe(container);
    applyScale();

    let raf = 0;
    function loop(t: number) {
      frameRef.current(ctx, t, { w: width, h: height });
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [width, height]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onPointerDown || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    onPointerDown({ x, y });
  }

  return (
    <div ref={containerRef} className={className ?? "relative flex h-full w-full items-center justify-center"}>
      <canvas
        ref={canvasRef}
        className="pixel-canvas block"
        onClick={handleClick}
        style={{ imageRendering: "pixelated" }}
      />
      {overlay && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: layout.left,
            top: layout.top,
            width: width * layout.scale,
            height: height * layout.scale,
          }}
        >
          {overlay}
        </div>
      )}
    </div>
  );
}
