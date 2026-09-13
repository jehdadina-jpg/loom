import { useEffect, useMemo, useRef, useState } from "react";
import { NineSlicePanel } from "../pixel/NineSlicePanel";
import { PixelButton } from "../pixel/PixelButton";
import { cloudLayer, farRidgeLayer, midRidgeLayer } from "../../engine/sprites/backdrop";
import type { StoryChapter } from "../../data/story";
import { speechEngine } from "../../game/speech/SpeechEngine";
import { audioEngine } from "../../game/audio/AudioEngine";

export interface ChapterCardProps {
  chapter: StoryChapter;
  narrationEnabled: boolean;
  textScale?: number;
  onContinue: () => void;
}

const W = 512;
const H = 288;

/**
 * A full-screen title card marking the start of a new chapter of the day. It never
 * blocks anything the guide banner already covers — it appears once per chapter, is
 * dismissed with a single tap, and never times out or punishes hesitation.
 */
export function ChapterCard({ chapter, narrationEnabled, textScale = 1, onContinue }: ChapterCardProps) {
  const [phase, setPhase] = useState<"in" | "settled">("in");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  const layers = useMemo(
    () => ({
      clouds: cloudLayer(chapter.id, W, 90, 4),
      far: farRidgeLayer(chapter.id, W, 150),
      mid: midRidgeLayer(chapter.id, W, 150),
    }),
    [chapter.id],
  );

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("settled"), 60);
    audioEngine.confirm();
    if (narrationEnabled) speechEngine.speak(`${chapter.subtitle}. ${chapter.narration}`);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    function draw(time: number) {
      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#182a52");
      sky.addColorStop(0.55, "#3c5f8c");
      sky.addColorStop(1, "#7fa0a8");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      const par = (depth: number) => -((time / (9000 / depth)) % (W * 0.4));
      ctx.drawImage(layers.clouds, par(0.6), 10);
      ctx.drawImage(layers.far, par(1.1) % W, 60);
      ctx.drawImage(layers.far, (par(1.1) % W) + W, 60);
      ctx.drawImage(layers.mid, par(1.8) % W, 90);
      ctx.drawImage(layers.mid, (par(1.8) % W) + W, 90);

      const vign = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
      vign.addColorStop(0, "rgba(0,0,0,0)");
      vign.addColorStop(1, "rgba(6,10,18,0.55)");
      ctx.fillStyle = vign;
      ctx.fillRect(0, 0, W, H);

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [layers]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0 h-full w-full" style={{ imageRendering: "pixelated" }} />

        <div
          className={`relative mx-6 max-w-md transition-all duration-500 ${
            phase === "in" ? "translate-y-3 scale-95 opacity-0" : "translate-y-0 scale-100 opacity-100"
          }`}
        >
          <NineSlicePanel tone="wood" className="px-7 py-6 text-center shadow-2xl" style={{ background: "rgba(30,20,12,0.86)" }}>
            <p
              className="font-pixel tracking-[0.3em] text-amber-200/90"
              style={{ fontSize: 11 * textScale }}
            >
              {chapter.title}
            </p>
            <h2
              className="mt-2 font-bold text-parchment drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]"
              style={{ fontSize: 26 * textScale }}
            >
              {chapter.subtitle}
            </h2>
            <p className="mt-3 leading-relaxed text-parchment/90" style={{ fontSize: 14.5 * textScale }}>
              {chapter.narration}
            </p>
            <div className="mt-6 flex justify-center">
              <PixelButton onClick={onContinue} tone="leaf" size="lg">
                Continue
              </PixelButton>
            </div>
          </NineSlicePanel>
        </div>
      </div>
    </div>
  );
}
