import { useEffect, useRef } from "react";

export interface PixelSpriteProps {
  bitmap: (time: number) => HTMLCanvasElement;
  scale?: number;
  animated?: boolean;
  className?: string;
}

/** Draws a cached pixel-art bitmap into a crisply-scaled canvas; can re-sample per frame for idle animation. */
export function PixelSprite({ bitmap, scale = 3, animated = false, className }: PixelSpriteProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    function draw(t: number) {
      const bmp = bitmap(t);
      if (canvas!.width !== bmp.width || canvas!.height !== bmp.height) {
        canvas!.width = bmp.width;
        canvas!.height = bmp.height;
        ctx.imageSmoothingEnabled = false;
      }
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.drawImage(bmp, 0, 0);
    }

    if (!animated) {
      draw(0);
      return;
    }
    let raf = 0;
    function loop(t: number) {
      draw(t);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bitmap, animated]);

  const first = bitmap(0);
  return (
    <canvas
      ref={ref}
      className={`pixel-canvas ${className ?? ""}`}
      width={first.width}
      height={first.height}
      style={{ width: first.width * scale, height: first.height * scale, imageRendering: "pixelated" }}
    />
  );
}
