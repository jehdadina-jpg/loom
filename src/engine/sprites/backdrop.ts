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


/**
 * Big dark leaves and grass blades along the bottom corners, drawn over the world and
 * shifted more than anything else by the parallax — the "camera is standing in a bush"
 * framing that gives a flat scene real depth.
 */
export function foregroundFoliageLayer(key: string, w: number, h: number): HTMLCanvasElement {
  return getProceduralBitmap(`fg-foliage-${key}-${w}x${h}`, { w, h }, (ctx) => {
    const leaf = (cx: number, cy: number, rx: number, ry: number, rot: number, tone: string) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PAL.leafShadow;
      ctx.fillRect(-1, -ry, 2, ry * 2);
      ctx.restore();
    };
    // left clump
    leaf(18, h - 6, 30, 14, -0.5, PAL.leafShadow);
    leaf(40, h - 2, 26, 12, -0.9, PAL.leafDark);
    leaf(6, h - 24, 22, 10, -1.2, PAL.leafShadow);
    leaf(60, h + 4, 24, 10, -0.3, PAL.leafDark);
    // right clump
    leaf(w - 22, h - 4, 32, 14, 0.5, PAL.leafShadow);
    leaf(w - 48, h, 26, 12, 0.9, PAL.leafDark);
    leaf(w - 8, h - 26, 22, 10, 1.2, PAL.leafShadow);
    leaf(w - 70, h + 4, 24, 10, 0.3, PAL.leafDark);
    // grass blades along the whole bottom edge
    for (let x = 0; x < w; x += 3) {
      const bh = 6 + Math.floor(hashNoise(x, 1, 7) * 10);
      const lean = Math.floor(hashNoise(x, 2, 8) * 3) - 1;
      ctx.fillStyle = hashNoise(x, 3, 9) < 0.5 ? PAL.leafShadow : PAL.leafDark;
      for (let y = 0; y < bh; y++) ctx.fillRect(x + Math.round((lean * y) / bh), h - y, 2, 1);
    }
  });
}

/** A thin waterfall down a far slope — stripes scroll each frame so it reads as moving. */
export function drawWaterfall(ctx: CanvasRenderingContext2D, x: number, topY: number, bottomY: number, time: number) {
  const hgt = bottomY - topY;
  ctx.fillStyle = PAL.waterDark;
  ctx.fillRect(x - 1, topY, 6, hgt);
  ctx.fillStyle = PAL.waterMid;
  ctx.fillRect(x, topY, 4, hgt);
  ctx.fillStyle = PAL.waterHi;
  const shift = Math.floor(time / 90) % 6;
  for (let y = topY + shift; y < bottomY; y += 6) ctx.fillRect(x + 1, y, 2, 3);
  ctx.fillStyle = PAL.waterFoam;
  for (let y = topY + ((shift + 3) % 6); y < bottomY; y += 6) ctx.fillRect(x + 2, y, 1, 1);
  // splash pool
  ctx.fillStyle = PAL.waterFoam;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(x - 3, bottomY - 1, 10, 2);
  ctx.globalAlpha = 1;
}

/** A small flock crossing the sky every so often, only in daylight. */
export function drawBirdFlock(ctx: CanvasRenderingContext2D, w: number, skyH: number, time: number) {
  const period = 42000;
  const t = (time % period) / period;
  if (t > 0.55) return;
  const x0 = -30 + (w + 60) * (t / 0.55);
  const y0 = skyH * 0.28 + Math.sin(time / 1300) * 6;
  ctx.fillStyle = "#1b1410";
  const flap = Math.floor(time / 180) % 2;
  const offs: [number, number][] = [
    [0, 0],
    [-8, 4],
    [-16, 8],
    [8, 4],
    [16, 8],
    [-24, 13],
    [24, 13],
  ];
  for (const [ox, oy] of offs) {
    const bx = Math.round(x0 + ox);
    const by = Math.round(y0 + oy);
    ctx.fillRect(bx - 2, by + flap, 2, 1);
    ctx.fillRect(bx, by, 1, 1);
    ctx.fillRect(bx + 1, by + flap, 2, 1);
  }
}


/**
 * A tall, ancient stone tower stacked in receding ledges — mossy caps, arched window
 * slits, a crack or two, and ivy trailing off the lower platforms. Sits far back in the
 * scene as its own parallax layer so a flat backdrop reads as a place with real height.
 */
export function stoneTowerLayer(key: string, w: number, h: number, side: "left" | "right" = "right"): HTMLCanvasElement {
  return getProceduralBitmap(`stonetower-${key}-${w}x${h}-${side}`, { w, h }, (ctx) => {
    const stone = PAL.stoneMid;
    const stoneDark = PAL.stoneShadow;
    const stoneLit = PAL.stoneHi;
    const moss = PAL.grassBase;
    const mossDark = PAL.grassShadow;

    const towerW = Math.round(w * 0.34);
    const baseX = side === "right" ? w - towerW - Math.round(w * 0.04) : Math.round(w * 0.04);
    const tiers = 5;
    const topY = h * 0.06;
    const bottomY = h;
    const tierH = (bottomY - topY) / tiers;

    for (let t = 0; t < tiers; t++) {
      const inset = t * (towerW * 0.09);
      const tw = towerW - inset * 2;
      const tx = baseX + inset;
      const ty = topY + t * tierH;
      const th = tierH + 4;

      // block body
      ctx.fillStyle = stone;
      ctx.fillRect(tx, ty, tw, th);
      // shaded face (away from the light)
      ctx.fillStyle = stoneDark;
      const shadeW = Math.round(tw * 0.4);
      if (side === "right") ctx.fillRect(tx, ty, shadeW, th);
      else ctx.fillRect(tx + tw - shadeW, ty, shadeW, th);
      // lit edge
      ctx.fillStyle = stoneLit;
      ctx.globalAlpha = 0.35;
      if (side === "right") ctx.fillRect(tx + tw - 3, ty, 3, th);
      else ctx.fillRect(tx, ty, 3, th);
      ctx.globalAlpha = 1;

      // brick coursing
      ctx.strokeStyle = stoneDark;
      ctx.globalAlpha = 0.65;
      for (let row = 0; row < th; row += 8) {
        ctx.beginPath();
        ctx.moveTo(tx, ty + row);
        ctx.lineTo(tx + tw, ty + row);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // arched window slit, lit warm
      const winX = tx + tw * (side === "right" ? 0.62 : 0.24);
      const winY = ty + th * 0.4;
      ctx.fillStyle = "#2a1f18";
      ctx.beginPath();
      ctx.moveTo(winX, winY + 10);
      ctx.lineTo(winX, winY + 3);
      ctx.quadraticCurveTo(winX + 3, winY - 2, winX + 6, winY + 3);
      ctx.lineTo(winX + 6, winY + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffd98a";
      ctx.globalAlpha = 0.55;
      ctx.fillRect(winX + 1, winY + 4, 4, 5);
      ctx.globalAlpha = 1;

      // mossy ledge cap on top of this tier, wider than the block below (platform read)
      const capOverhang = 5;
      ctx.fillStyle = mossDark;
      ctx.fillRect(tx - capOverhang, ty - 2, tw + capOverhang * 2, 3);
      ctx.fillStyle = moss;
      ctx.fillRect(tx - capOverhang, ty - 2, tw + capOverhang * 2, 1);
      // little moss tufts
      for (let i = 0; i < tw; i += 8) {
        if (hashNoise(i, t, 5) > 0.55) {
          ctx.fillStyle = mossDark;
          ctx.fillRect(tx - capOverhang + i, ty - 5, 2, 3);
        }
      }

      // a crack down one tier for age
      if (t === 2) {
        ctx.strokeStyle = stoneDark;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(tx + tw * 0.3, ty + 2);
        ctx.lineTo(tx + tw * 0.34, ty + th * 0.5);
        ctx.lineTo(tx + tw * 0.28, ty + th - 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ivy trailing from the ledge on alternating tiers
      if (t % 2 === 1) {
        ctx.fillStyle = mossDark;
        const ivyX = tx + (side === "right" ? tw * 0.15 : tw * 0.75);
        for (let iy = 0; iy < th * 0.6; iy += 4) {
          ctx.fillRect(ivyX + Math.sin(iy * 0.5) * 2, ty + iy, 2, 3);
        }
      }
    }

    // a lone flag/banner near the top for a hint of life
    ctx.fillStyle = "#8a3b3b";
    const flagX = baseX + towerW * (side === "right" ? 0.5 : 0.5);
    ctx.fillRect(flagX, topY - 10, 1, 12);
    ctx.beginPath();
    ctx.moveTo(flagX + 1, topY - 9);
    ctx.lineTo(flagX + 9, topY - 6);
    ctx.lineTo(flagX + 1, topY - 3);
    ctx.closePath();
    ctx.fill();
  });
}
