import { useEffect, useMemo, useRef, useState } from "react";
import { PixelStage, STAGE_H, STAGE_W, type StageLayout } from "../../engine/PixelStage";
import {
  drawSky,
  drawAtmosphericHaze,
  cloudLayer,
  farRidgeLayer,
  midRidgeLayer,
  stoneTowerLayer,
  forestLayer,
  terraceLayer,
  foregroundFoliageLayer,
  drawWaterfall,
  drawBirdFlock,
  drawCloudShadows,
  LAYER_OVERSCAN,
} from "../../engine/sprites/backdrop";
import { drawTileGrid, tileBitmapFor, TILE } from "../../engine/tilemap";
import { renderWorldObjects } from "../../engine/world";
import { skyStateFor, phaseFor, type TimeMode } from "../../engine/fx/DayNight";
import { ParticleField } from "../../engine/fx/Particles";
import { weatherState, weatherEmitters, drawWeatherOverlay, drawRainRipples, type WeatherKind } from "../../engine/fx/Weather";
import { drawLights, drawGodRays, drawStars, drawWaterReflection, drawLensFlare } from "../../engine/fx/Lighting";
import type { LocationScene, Hotspot, EasterEgg } from "../../data/locations/types";
import { HotspotPlaque } from "./HotspotPlaque";
import { iconSprite } from "../../engine/sprites/icons";
import { PixelSprite } from "../pixel/PixelSprite";

export interface WorldCanvasProps {
  scene: LocationScene;
  onHotspot: (h: Hotspot) => void;
  onMiss?: () => void;
  onBack?: () => void;
  onEasterEgg?: (egg: EasterEgg) => void;
  suggestedHotspotId?: string | null;
  textScale?: number;
  highContrast?: boolean;
  reducedMotion?: boolean;
  timeMode?: TimeMode;
  weather?: WeatherKind;
  /** HUD rendered inside the stage overlay, so it shares the canvas coordinate space. */
  topHud?: React.ReactNode;
  /** Renders the world with no labels, banner or controls — used behind the title screen. */
  chromeless?: boolean;
}

/** A soft diagonal shimmer that drifts across any water tiles in the scene. */
function drawWaterCaustics(ctx: CanvasRenderingContext2D, grid: string[][], originY: number, time: number, isNight: boolean) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = isNight ? 0.05 : 0.09;
  ctx.fillStyle = "#eafcff";
  for (let gy = 0; gy < grid.length; gy++) {
    const row = grid[gy];
    for (let gx = 0; gx < row.length; gx++) {
      if (!row[gx].startsWith("water")) continue;
      const wx = gx * TILE;
      const wy = originY + gy * TILE;
      const shift = ((time / 1400 + gx * 0.6 + gy * 0.35) % 1) * TILE * 1.6 - TILE * 0.3;
      ctx.save();
      ctx.beginPath();
      ctx.rect(wx, wy, TILE, TILE);
      ctx.clip();
      ctx.fillRect(wx + shift, wy, 4, TILE);
      ctx.fillRect(wx + shift + TILE * 0.7, wy, 3, TILE);
      ctx.restore();
    }
  }
  ctx.restore();
}

export function WorldCanvas({
  scene,
  onHotspot,
  onMiss,
  onBack,
  onEasterEgg,
  suggestedHotspotId,
  textScale = 1,
  highContrast = false,
  reducedMotion = false,
  timeMode = "cycle",
  weather = "clear",
  topHud,
  chromeless = false,
}: WorldCanvasProps) {
  const groundOriginY = Math.round(scene.horizonRatio * STAGE_H);
  const [layout, setLayout] = useState<StageLayout>({ left: 0, top: 0, scale: 1 });
  const [showBanner, setShowBanner] = useState(true);
  const bannerTimer = useRef<number | null>(null);
  // measured, not guessed: the guide banner below needs to clear whatever height the
  // arrival banner actually renders at, which varies with text length and textScale
  const bannerRef = useRef<HTMLDivElement>(null);
  const [bannerH, setBannerH] = useState(0);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBannerH(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [scene.id, textScale]);

  // parallax: layers respond to a slow drift plus the pointer, giving depth
  // without ever moving the play area the player is aiming at
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const particlesRef = useRef(new ParticleField());
  // scratch buffer holding the world above the waterline, so it can be mirrored
  const reflectBufRef = useRef<HTMLCanvasElement | null>(null);
  // the moment we last arrived somewhere, so entry can ease to rest instead of snapping
  const enterAtRef = useRef(performance.now());
  // the sky eases toward whatever phase is requested instead of snapping to it, so
  // tapping the day/night control is a dusk-like transition, not a hard cut
  const displayPhaseRef = useRef<number | null>(null);
  // the gloom from weather (rain/mist darkening) also eases in and out
  const displayGloomRef = useRef(0);

  useEffect(() => {
    setShowBanner(true);
    enterAtRef.current = performance.now();
    if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setShowBanner(false), 3200);
    return () => {
      if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
    };
  }, [scene.id]);

  const weatherNow = useMemo(() => weatherState(weather), [weather]);

  useEffect(() => {
    const field = particlesRef.current;
    field.clear();
    field.setEmitters([...(scene.emitters ?? []), ...weatherEmitters(weather, STAGE_W)]);
  }, [scene.id, scene.emitters, weather]);

  const layerW = Math.ceil(STAGE_W * LAYER_OVERSCAN);
  const skyH = groundOriginY + TILE;

  const layers = useMemo(
    () => ({
      clouds: cloudLayer(scene.id, layerW, Math.max(40, skyH * 0.5)),
      far: farRidgeLayer(scene.id, layerW, skyH),
      mid: midRidgeLayer(scene.id, layerW, skyH),
      tower: scene.stoneTower ? stoneTowerLayer(scene.id, layerW, skyH) : null,
      forest: forestLayer(scene.id, layerW, skyH),
      terrace: terraceLayer(scene.id, layerW, skyH, scene.terraces),
      foliage: foregroundFoliageLayer(scene.id, layerW, 44),
    }),
    [scene.id, scene.terraces, scene.stoneTower, layerW, skyH],
  );

  function handleFrame(ctx: CanvasRenderingContext2D, time: number) {
    const t = reducedMotion ? 0 : time;
    const targetPhase = scene.fixedPhase ?? phaseFor(timeMode, Date.now());
    if (displayPhaseRef.current === null || reducedMotion) {
      displayPhaseRef.current = targetPhase;
    } else {
      // shortest arc around the 0..1 day circle, eased toward the target each frame
      let delta = targetPhase - displayPhaseRef.current;
      delta -= Math.round(delta);
      displayPhaseRef.current = (((displayPhaseRef.current + delta * 0.045) % 1) + 1) % 1;
    }
    const phase = displayPhaseRef.current;
    const sky = skyStateFor(phase);

    const px = pointerRef.current.x - 0.5;
    const drift = reducedMotion ? 0 : Math.sin(time / 9000) * 0.5;
    // a slow settling drift on arrival — the world eases to rest instead of snapping in,
    // giving every new place a gentle "camera landing" moment
    const sinceEnter = reducedMotion ? 999999 : performance.now() - enterAtRef.current;
    const enterEase = Math.max(0, 1 - sinceEnter / 1100);
    const enterPush = enterEase * enterEase * 10;
    const par = (depth: number) => -(px * depth * 16 + drift * depth * 10 + enterPush * depth) - (layerW - STAGE_W) / 2;

    ctx.clearRect(0, 0, STAGE_W, STAGE_H);

    // --- BACKGROUND: sky, stars, sun shafts, then parallax ridges
    drawSky(ctx, sky, STAGE_W, skyH);
    drawStars(ctx, sky, STAGE_W, skyH, time);
    drawGodRays(ctx, sky, STAGE_W, skyH, weather === "clear" ? 1 : 0.4);
    drawLensFlare(ctx, sky, STAGE_W, skyH);

    ctx.drawImage(layers.clouds, par(0.25), 6 + Math.sin(time / 12000) * 2);
    if (!sky.isNight) drawBirdFlock(ctx, STAGE_W, skyH, time);
    ctx.drawImage(layers.far, par(0.4), 0);
    if (layers.tower) {
      ctx.drawImage(layers.tower, par(0.55), 0);
      drawWaterfall(ctx, Math.round(STAGE_W * 0.78 + par(0.55) + (layerW - STAGE_W) / 2), skyH * 0.18, skyH * 0.92, t);
    }
    ctx.drawImage(layers.mid, par(0.7), 0);
    // a thread of water off the middle ridge
    if (!layers.tower) {
      drawWaterfall(ctx, Math.round(STAGE_W * 0.62 + par(0.7) + (layerW - STAGE_W) / 2), skyH * 0.5, skyH * 0.86, t);
    }
    ctx.drawImage(layers.forest, par(1.0), 0);
    ctx.drawImage(layers.terrace, par(1.4), 0);

    drawAtmosphericHaze(ctx, sky, STAGE_W, groundOriginY);

    // --- MIDGROUND: the tiled ground the player stands on
    drawTileGrid(ctx, scene.tileGrid, 0, groundOriginY, t);
    if (weather === "clear" && !sky.isNight) drawCloudShadows(ctx, STAGE_W, groundOriginY, STAGE_H, t);
    drawWaterCaustics(ctx, scene.tileGrid, groundOriginY, t, sky.isNight);
    const gridBottom = groundOriginY + scene.tileGrid.length * TILE;
    if (gridBottom < STAGE_H) {
      const lastRow = scene.tileGrid[scene.tileGrid.length - 1];
      const extraRows = Math.ceil((STAGE_H - gridBottom) / TILE);
      for (let r = 0; r < extraRows; r++) {
        const y = gridBottom + r * TILE;
        for (let gx = 0; gx < lastRow.length; gx++) {
          ctx.drawImage(tileBitmapFor(lastRow[gx], gx, scene.tileGrid.length + r, t), gx * TILE, y);
        }
      }
    }

    // ground depth shading: darken at the horizon and in the near foreground so the
    // middle band where people and objects stand reads as the lit, legible stage
    const depth = ctx.createLinearGradient(0, groundOriginY, 0, STAGE_H);
    depth.addColorStop(0, "rgba(18,30,20,0.42)");
    depth.addColorStop(0.18, "rgba(18,30,20,0.10)");
    depth.addColorStop(0.55, "rgba(255,247,214,0.05)");
    depth.addColorStop(1, "rgba(10,18,12,0.38)");
    ctx.fillStyle = depth;
    ctx.fillRect(0, groundOriginY, STAGE_W, STAGE_H - groundOriginY);

    // --- REFLECTIONS: mirror everything above the waterline into the pond
    if (scene.waterRect) {
      const buf = (reflectBufRef.current ??= document.createElement("canvas"));
      if (buf.width !== STAGE_W || buf.height !== STAGE_H) {
        buf.width = STAGE_W;
        buf.height = STAGE_H;
      }
      const bctx = buf.getContext("2d")!;
      bctx.clearRect(0, 0, STAGE_W, STAGE_H);
      bctx.drawImage(ctx.canvas, 0, 0);
      drawWaterReflection(ctx, buf, scene.waterRect, time, 0.3);
      if (weather === "rain") drawRainRipples(ctx, scene.waterRect, time);
    }

    // --- PLAY AREA: every entity, depth-sorted, with sun-driven cast shadows
    renderWorldObjects(ctx, scene.objects(t), t, sky);

    // gentle pool of light under each interactive landmark (never button chrome)
    for (const h of chromeless ? [] : scene.hotspots) {
      const pulse = reducedMotion ? 0.22 : 0.2 + 0.08 * Math.sin(time / 620 + h.x);
      const cx = h.x + h.w / 2;
      const cy = h.y + h.h - 4;
      ctx.save();
      ctx.globalAlpha = suggestedHotspotId === h.id ? 0.55 : pulse;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22);
      grad.addColorStop(0, "rgba(255,226,150,0.85)");
      grad.addColorStop(1, "rgba(255,226,150,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --- ATMOSPHERE: global light wash, lamps, weather, particles
    ctx.fillStyle = hexA(sky.lightTint, sky.lightAlpha);
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);

    if (scene.lights) drawLights(ctx, scene.lights, sky, time);

    displayGloomRef.current += (weatherNow.gloom - displayGloomRef.current) * (reducedMotion ? 1 : 0.06);
    const easedWeather = { ...weatherNow, gloom: displayGloomRef.current };
    drawWeatherOverlay(ctx, easedWeather, STAGE_W, STAGE_H, groundOriginY, time);

    if (!reducedMotion) {
      particlesRef.current.update(time, weatherNow.wind, sky.isNight || sky.lampsOn);
      particlesRef.current.draw(ctx, STAGE_W, STAGE_H);
    }

    // foreground foliage frames the shot and moves the most with the pointer
    if (!chromeless) {
      ctx.drawImage(layers.foliage, par(2.2), STAGE_H - 44 + Math.round(Math.sin(time / 2600) * 1.5));
    }

    // vignette focuses attention on the centre of the scene
    const vig = ctx.createRadialGradient(
      STAGE_W / 2,
      STAGE_H * 0.55,
      STAGE_H * 0.3,
      STAGE_W / 2,
      STAGE_H * 0.55,
      STAGE_W * 0.72,
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, highContrast ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.33)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  }

  function handlePointerDown(pos: { x: number; y: number }) {
    if (chromeless) return;

    // labelled destinations always win a tap
    for (const h of [...scene.hotspots].reverse()) {
      if (pos.x >= h.x && pos.x <= h.x + h.w && pos.y >= h.y && pos.y <= h.y + h.h) {
        onHotspot(h);
        return;
      }
    }

    // then the unlabelled delights hidden in the scenery
    for (const egg of scene.easterEggs ?? []) {
      if (pos.x >= egg.x && pos.x <= egg.x + egg.w && pos.y >= egg.y && pos.y <= egg.y + egg.h) {
        const bx = egg.x + egg.w / 2;
        const by = egg.y + egg.h / 2;
        particlesRef.current.burst(egg.burst ?? "dust", bx, by, egg.burstCount ?? 10);
        // a second, sparser burst of light dust always joins in so every find feels a
        // little magical, not just a repeat of whatever the egg's own burst kind is
        particlesRef.current.burst("dust", bx, by, Math.max(4, Math.round((egg.burstCount ?? 10) * 0.4)));
        onEasterEgg?.(egg);
        return;
      }
    }

    onMiss?.();
  }

  // Pack plaques onto rows so no two labels ever overlap: sorted left to right, each
  // plaque takes the first row where it clears the previous plaque on that row.
  const rowOf = new Map<string, number>();
  {
    const font = Math.round((10 + layout.scale * 2) * textScale);
    const iconW = (layout.scale >= 3 ? 2 : 1) * 16;
    const rowEnds: number[] = [];
    const gap = 10;
    [...scene.hotspots]
      .sort((a, b) => a.x + a.w / 2 - (b.x + b.w / 2))
      .forEach((h) => {
        const estW = h.label.length * font * 0.6 + iconW + font * 1.3 + 18;
        const cx = (h.x + h.w / 2) * layout.scale;
        const left = cx - estW / 2;
        const right = cx + estW / 2;
        let row = rowEnds.findIndex((end) => end + gap <= left);
        if (row === -1) {
          row = rowEnds.length;
          rowEnds.push(right);
        } else {
          rowEnds[row] = right;
        }
        rowOf.set(h.id, row);
      });
  }

  const overlay = chromeless ? null : (
    <div className="relative h-full w-full">
      {scene.hotspots.map((h) => (
        <HotspotPlaque
          key={h.id}
          hotspot={h}
          scale={layout.scale}
          stageWidth={STAGE_W}
          row={rowOf.get(h.id) ?? 0}
          suggested={suggestedHotspotId === h.id}
          onActivate={onHotspot}
          textScale={textScale}
          reducedMotion={reducedMotion}
        />
      ))}

      {scene.backTo && onBack && (
        <button
          onClick={onBack}
          className="pointer-events-auto absolute left-3 top-3 z-10 flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-[#f7ecd2] transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 active:translate-y-0.5"
          style={{
            background: "linear-gradient(#6d4a2f,#4a2f1e)",
            border: "2px solid #2e1c13",
            boxShadow: "0 3px 0 rgba(0,0,0,0.4), 0 6px 14px rgba(0,0,0,0.35)",
            fontSize: 14 * textScale,
          }}
        >
          <PixelSprite bitmap={() => iconSprite("back")} scale={1} />
          Back to Village
        </button>
      )}

      {(() => {
        const bannerTop = scene.backTo ? 58 : 20;
        // Fall back to a generous guess for the one frame before ResizeObserver has
        // measured the real box, so nothing flashes overlapped on mount.
        const clearance = bannerH > 0 ? bannerTop + bannerH + 14 : bannerTop + 66 * textScale;
        return (
          topHud && (
            <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ top: clearance }}>
              {topHud}
            </div>
          )
        );
      })()}

      {/* arrival banner — always name the place you just walked into. It sits below
          the back button rather than beside it, so a wide button at large text sizes
          never runs into it. Its real rendered height is measured (see bannerRef)
          so the guide banner below always clears it, at any text scale or wording. */}
      <div
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 transition-all duration-500 ${
          showBanner ? "opacity-100" : "-translate-y-2 opacity-0"
        }`}
        style={{ top: scene.backTo ? 58 : 20 }}
      >
        <div
          ref={bannerRef}
          className="rounded-xl px-5 py-2.5 text-center"
          style={{
            background: "linear-gradient(#f3e3c3,#e0c896)",
            border: "2px solid #4a2f1e",
            boxShadow: "0 4px 0 rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.35)",
          }}
        >
          <div className="font-pixel text-[#3b2a1a]" style={{ fontSize: 11 * textScale }}>
            {scene.name}
          </div>
          <div className="mt-1 text-[#5c4529]" style={{ fontSize: 12.5 * textScale }}>
            {scene.subtitle}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="h-full w-full"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        pointerRef.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      }}
    >
      <PixelStage onFrame={handleFrame} onPointerDown={handlePointerDown} onLayout={setLayout} overlay={overlay} />
    </div>
  );
}

function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}
