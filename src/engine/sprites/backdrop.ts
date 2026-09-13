import { PAL } from "../palette";
import { getProceduralBitmap, hashNoise } from "../pixelArt";
import type { SkyState } from "../fx/DayNight";

/** Layers are drawn wider than the stage so parallax can shift them without showing an edge. */
export const LAYER_OVERSCAN = 1.25;

function ridgePath(
  ctx: CanvasRenderingContext2D,
  w: number,
  baseY: number,
  amp: number,
  freq: number,
  phase: number,
  bottomY: number,
) {
  ctx.beginPath();
  ctx.moveTo(0, bottomY);
  for (let x = 0; x <= w; x += 2) {
    const y =
      baseY -
      amp * Math.sin(x * freq + phase) -
      amp * 0.45 * Math.sin(x * freq * 2.3 + phase * 1.7) -
      amp * 0.2 * Math.sin(x * freq * 5.1 + phase * 0.4);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, bottomY);
  ctx.closePath();
}

/** Dynamic sky: gradient, sun or moon disc, and its glow — redrawn every frame. */
export function drawSky(ctx: CanvasRenderingContext2D, sky: SkyState, w: number, skyH: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, skyH);
  grad.addColorStop(0, sky.skyTop);
  grad.addColorStop(0.62, sky.skyMid);
  grad.addColorStop(1, sky.skyLow);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, skyH + 2);

  const sx = sky.sunX * w;
  const sy = sky.sunY * skyH;

  // glow
  const glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, sky.isNight ? 30 : 58);
  glow.addColorStop(0, hexA(sky.sunColor, sky.sunGlowAlpha));
  glow.addColorStop(1, hexA(sky.sunColor, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 60, sy - 60, 120, 120);

  // disc — a sun by day, a moon at night
  ctx.fillStyle = sky.sunColor;
  const r = sky.isNight ? 5 : 7;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  if (sky.isNight) {
    ctx.fillStyle = sky.skyTop;
    ctx.beginPath();
    ctx.arc(sx + 3, sy - 2, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function cloudLayer(key: string, w: number, h: number, density = 5): HTMLCanvasElement {
  return getProceduralBitmap(`clouds-${key}-${w}x${h}-${density}`, { w, h }, (ctx) => {
    for (let i = 0; i < density; i++) {
      const cx = ((i * 137 + 40) % (w + 80)) - 40;
      const cy = 8 + (i % 3) * 16 + hashNoise(i, 1, 3) * 8;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(cx, cy, 20, 5);
      ctx.fillRect(cx + 6, cy - 4, 13, 6);
      ctx.fillRect(cx - 5, cy + 3, 25, 4);
      ctx.fillStyle = "rgba(200,220,232,0.75)";
      ctx.fillRect(cx - 5, cy + 6, 25, 2);
    }
  });
}

export function farRidgeLayer(key: string, w: number, h: number): HTMLCanvasElement {
  return getProceduralBitmap(`ridge-far-${key}-${w}x${h}`, { w, h }, (ctx) => {
    ridgePath(ctx, w, h * 0.46, 24, 0.012, 1.3, h);
    ctx.fillStyle = PAL.mtnFar;
    ctx.fill();
    // snow catches on the peaks
    ctx.fillStyle = PAL.mtnSnow;
    ctx.globalAlpha = 0.85;
    for (let x = 0; x < w; x += 3) {
      const y = h * 0.46 - 24 * Math.sin(x * 0.012 + 1.3) - 24 * 0.45 * Math.sin(x * 0.012 * 2.3 + 1.3 * 1.7);
      if (hashNoise(x, 2, 9) < 0.5) ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  });
}

export function midRidgeLayer(key: string, w: number, h: number): HTMLCanvasElement {
  return getProceduralBitmap(`ridge-mid-${key}-${w}x${h}`, { w, h }, (ctx) => {
    ridgePath(ctx, w, h * 0.64, 30, 0.017, 4.1, h);
    ctx.fillStyle = PAL.mtnMid;
    ctx.fill();
    // tiny houses dotted across the near slope give the scale away
    for (let i = 0; i < 6; i++) {
      const hx = (i * 83 + 30) % w;
      const hy = h * (0.72 + hashNoise(i, 4, 11) * 0.16);
      ctx.fillStyle = PAL.woodShadow;
      ctx.fillRect(hx, hy, 5, 4);
      ctx.fillStyle = PAL.thatchDark;
      ctx.beginPath();
      ctx.moveTo(hx - 1, hy);
      ctx.lineTo(hx + 2.5, hy - 3);
      ctx.lineTo(hx + 6, hy);
      ctx.closePath();
      ctx.fill();
    }
  });
}

export function forestLayer(key: string, w: number, h: number): HTMLCanvasElement {
  return getProceduralBitmap(`forest-${key}-${w}x${h}`, { w, h }, (ctx) => {
    ridgePath(ctx, w, h * 0.78, 11, 0.09, 2.2, h);
    ctx.fillStyle = PAL.leafShadow;
    ctx.fill();
  });
}

export function terraceLayer(key: string, w: number, h: number, terraces: boolean): HTMLCanvasElement {
  return getProceduralBitmap(`terrace-${key}-${w}x${h}-${terraces}`, { w, h }, (ctx) => {
    if (!terraces) {
      ridgePath(ctx, w, h * 0.88, 9, 0.05, 0.6, h + 2);
      ctx.fillStyle = PAL.leafDark;
      ctx.fill();
      return;
    }
    const top = h * 0.62;
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      const y = top + r * ((h - top) / rows);
      const bandH = (h - top) / rows;
      ridgePath(ctx, w, y + bandH * 0.4, 6, 0.02 + r * 0.004, r * 1.7, y + bandH + 4);
      ctx.fillStyle = r % 2 === 0 ? PAL.grassMid : PAL.grassBase;
      ctx.fill();
      ctx.strokeStyle = PAL.grassShadow;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const yy = y + bandH * 0.4 - 6 * Math.sin(x * (0.02 + r * 0.004) + r * 1.7);
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });
}

/** Haze at the horizon pushes the far layers back and softens the tile seam. */
export function drawAtmosphericHaze(ctx: CanvasRenderingContext2D, sky: SkyState, w: number, groundY: number) {
  const haze = ctx.createLinearGradient(0, groundY - 46, 0, groundY + 6);
  haze.addColorStop(0, hexA(sky.skyLow, 0));
  haze.addColorStop(1, hexA(sky.skyLow, 0.42));
  ctx.fillStyle = haze;
  ctx.fillRect(0, groundY - 46, w, 52);
}

function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}
