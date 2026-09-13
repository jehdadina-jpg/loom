import type { SkyState } from "./DayNight";

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  color: string;
  /** Lantern and hearth lights only come on as the day fades. */
  nightOnly?: boolean;
  flicker?: boolean;
}

/**
 * Warm light pools are drawn additively so windows, lanterns and the hearth
 * actually spill onto the ground around them once the sun goes down.
 */
export function drawLights(
  ctx: CanvasRenderingContext2D,
  lights: LightSource[],
  sky: SkyState,
  time: number,
) {
  const nightFactor = Math.max(sky.starAlpha, sky.lampsOn ? 0.45 : 0);
  if (nightFactor <= 0.02) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const l of lights) {
    if (l.nightOnly && !sky.lampsOn) continue;
    const flick = l.flicker ? 0.86 + 0.14 * Math.sin(time / 90 + l.x) * Math.sin(time / 37 + l.y) : 1;
    const alpha = nightFactor * 0.85 * flick;
    const grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.radius);
    grad.addColorStop(0, hexWithAlpha(l.color, alpha));
    grad.addColorStop(0.45, hexWithAlpha(l.color, alpha * 0.35));
    grad.addColorStop(1, hexWithAlpha(l.color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

/** Volumetric shafts from the sun, angled to match its position. */
export function drawGodRays(
  ctx: CanvasRenderingContext2D,
  sky: SkyState,
  w: number,
  skyH: number,
  intensity: number,
) {
  if (sky.isNight || intensity <= 0) return;
  const sx = sky.sunX * w;
  const sy = sky.sunY * skyH;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const spread = (i - 2) * 0.16;
    const len = skyH * 3;
    const angle = Math.PI / 2 + spread;
    const ex = sx + Math.cos(angle) * len;
    const ey = sy + Math.sin(angle) * len;
    const grad = ctx.createLinearGradient(sx, sy, ex, ey);
    grad.addColorStop(0, hexWithAlpha(sky.sunColor, 0.16 * intensity));
    grad.addColorStop(1, hexWithAlpha(sky.sunColor, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex - 26, ey);
    ctx.lineTo(ex + 26, ey);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A soft ground shadow whose direction and length track the sun. */
export function drawCastShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  sky: SkyState,
) {
  const len = Math.max(3, height * sky.shadowLen * 0.42);
  ctx.save();
  ctx.globalAlpha = sky.shadowAlpha;
  ctx.fillStyle = "#0d1a12";
  ctx.translate(x, y);
  ctx.transform(1, 0, sky.shadowDx * 0.55, 0.34, 0, 0);
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(4, width * 0.42), len * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Star field, only visible once the sky is dark enough to carry it. */
export function drawStars(ctx: CanvasRenderingContext2D, sky: SkyState, w: number, skyH: number, time: number) {
  if (sky.starAlpha <= 0.02) return;
  ctx.save();
  for (let i = 0; i < 70; i++) {
    const seed = i * 127.3;
    const x = (seed * 7.3) % w;
    const y = ((seed * 3.1) % skyH) * 0.82;
    const twinkle = 0.55 + 0.45 * Math.sin(time / 700 + i);
    ctx.globalAlpha = sky.starAlpha * twinkle * 0.9;
    ctx.fillStyle = i % 9 === 0 ? "#ffe9c0" : "#ffffff";
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.restore();
}

/** Vertically mirrored, wave-distorted copy of the world above the waterline. */
export function drawWaterReflection(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  rect: { x: number; y: number; w: number; h: number },
  time: number,
  strength = 0.32,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();

  // Mirror one thin band at a time so each row can be nudged into a ripple, and fade
  // with depth — reflections are strongest right at the waterline and die away further out.
  const bandH = 2;
  for (let dy = 0; dy < rect.h; dy += bandH) {
    const srcY = rect.y - dy - bandH;
    if (srcY < 0) break;
    const depth = dy / rect.h;
    ctx.globalAlpha = strength * Math.max(0, 1 - depth * 1.15);
    const wobble = Math.sin(time / 520 + dy / 7) * (0.6 + dy / 40);
    ctx.drawImage(source, rect.x, srcY, rect.w, bandH, rect.x + wobble, rect.y + dy, rect.w, bandH);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}
