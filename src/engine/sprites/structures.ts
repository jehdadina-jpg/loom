import { PAL } from "../palette";
import { getProceduralBitmap, hashNoise } from "../pixelArt";

/** Shade a rectangle with a subtle left-highlight / right-shadow gradient band, for a plank/beam look. */
function shadedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  dark: string,
  hi: string,
) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = hi;
  ctx.fillRect(x, y, Math.max(1, Math.round(w * 0.25)), h);
  ctx.fillStyle = dark;
  ctx.fillRect(x + w - Math.max(1, Math.round(w * 0.2)), y, Math.max(1, Math.round(w * 0.2)), h);
}

function plankTexture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) {
  for (let px = x; px < x + w; px += 4 + (seed % 2)) {
    ctx.fillStyle = PAL.woodShadow;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(px, y, 1, h);
    ctx.globalAlpha = 1;
  }
}

export interface HouseOptions {
  variant: number;
  width?: number;
  roofColor?: "thatch" | "slate";
  withStilts?: boolean;
  accent?: string;
}

/** A full wooden village house: stilts, plank walls, window, door, gable thatch roof, porch beam. */
export function houseSprite(opts: HouseOptions): HTMLCanvasElement {
  const w = opts.width ?? 72;
  const h = 66;
  const key = `house-${opts.variant}-${w}-${opts.roofColor}-${opts.withStilts}-${opts.accent ?? "n"}`;
  return getProceduralBitmap(key, { w, h }, (ctx) => {
    const stiltH = opts.withStilts === false ? 0 : 10;
    const wallTop = 24;
    const wallBottom = h - 6 - stiltH;
    const wallH = wallBottom - wallTop;

    // ground shadow
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 3, w * 0.42, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // stilts
    if (stiltH > 0) {
      const stiltXs = [8, w - 12, w / 2 - 3];
      for (const sx of stiltXs) {
        shadedRect(ctx, sx, h - stiltH - 6, 5, stiltH + 6, PAL.woodDark, PAL.woodShadow, PAL.woodBase);
      }
    }

    // walls
    shadedRect(ctx, 2, wallTop, w - 4, wallH, PAL.woodBase, PAL.woodShadow, PAL.woodHi);
    plankTexture(ctx, 2, wallTop, w - 4, wallH, opts.variant);
    // base trim
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(2, wallBottom - 3, w - 4, 3);

    // window
    const winW = 12,
      winH = 10;
    const winX = w * 0.2;
    const winY = wallTop + 5;
    ctx.fillStyle = PAL.frameCream;
    ctx.fillRect(winX - 2, winY - 2, winW + 4, winH + 4);
    ctx.fillStyle = PAL.woodShadow;
    ctx.fillRect(winX - 1, winY - 1, winW + 2, winH + 2);
    ctx.fillStyle = PAL.skyMid;
    ctx.fillRect(winX, winY, winW, winH);
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(winX + winW / 2 - 0.5, winY, 1, winH);
    ctx.fillRect(winX, winY + winH / 2 - 0.5, winW, 1);
    // shutters
    ctx.fillStyle = opts.accent ?? PAL.clothTeal;
    ctx.fillRect(winX - 4, winY, 3, winH);
    ctx.fillRect(winX + winW + 1, winY, 3, winH);

    // door — a distinctly painted panel (not wood-on-wood) so it pops against the wall
    const doorW = 14,
      doorH = wallH - 8;
    const doorX = w * 0.62;
    const doorY = wallBottom - doorH;
    ctx.fillStyle = PAL.frameCream;
    ctx.fillRect(doorX - 2, doorY - 2, doorW + 4, doorH + 2);
    ctx.fillStyle = PAL.doorShadow;
    ctx.fillRect(doorX - 1, doorY - 1, doorW + 2, doorH + 1);
    shadedRect(ctx, doorX, doorY, doorW, doorH, PAL.doorMid, PAL.doorShadow, PAL.doorHi);
    ctx.fillStyle = PAL.doorShadow;
    ctx.globalAlpha = 0.7;
    for (let px = doorX + 3; px < doorX + doorW; px += 4) ctx.fillRect(px, doorY, 1, doorH);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.clothMustard;
    ctx.fillRect(doorX + doorW - 4, doorY + doorH / 2, 2, 2);

    // porch beam
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(0, wallTop - 3, w, 3);

    // roof (gable)
    const roofBaseY = wallTop - 2;
    const roofPeakY = 2;
    const overhang = 8;
    const isThatch = (opts.roofColor ?? "thatch") === "thatch";
    const roofDark = isThatch ? PAL.thatchShadow : PAL.roofSlateShadow;
    const roofBase = isThatch ? PAL.thatchBase : PAL.roofSlateBase;
    const roofMid = isThatch ? PAL.thatchMid : PAL.roofSlateMid;
    const roofHi = isThatch ? PAL.thatchHi : PAL.roofSlateDark;

    for (let y = roofPeakY; y <= roofBaseY; y++) {
      const t = (y - roofPeakY) / (roofBaseY - roofPeakY);
      const halfW = t * (w / 2 + overhang);
      const left = Math.round(w / 2 - halfW);
      const right = Math.round(w / 2 + halfW);
      for (let x = left; x <= right; x++) {
        const rel = (x - left) / Math.max(1, right - left);
        let c: string;
        if (rel < 0.12) c = roofHi;
        else if (rel < 0.55) c = roofBase;
        else if (rel < 0.85) c = roofMid;
        else c = roofDark;
        // horizontal thatch/slate banding texture
        if (isThatch && (y - roofPeakY) % 3 === 0) c = roofDark;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // roof ridge highlight
    ctx.fillStyle = roofHi;
    ctx.fillRect(w / 2 - 1, roofPeakY, 2, roofBaseY - roofPeakY);
    // roof texture flecks
    for (let i = 0; i < 14; i++) {
      const fx = Math.floor(hashNoise(i, opts.variant, 3) * w);
      const fy = roofPeakY + Math.floor(hashNoise(i, opts.variant, 4) * (roofBaseY - roofPeakY));
      ctx.fillStyle = roofDark;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(fx, fy, 1, 1);
      ctx.globalAlpha = 1;
    }
  });
}

/** A wooden wayfinding signpost — an in-world marker that a destination is here. */
export function signpostSprite(direction: "left" | "right" | "none" = "none"): HTMLCanvasElement {
  return getProceduralBitmap(`signpost-${direction}`, { w: 22, h: 26 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(11, 25, 5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // post
    shadedRect(ctx, 9, 8, 4, 17, PAL.woodDark, PAL.woodShadow, PAL.woodBase);

    // board
    shadedRect(ctx, 1, 3, 20, 11, PAL.woodMid, PAL.woodShadow, PAL.woodPale);
    ctx.fillStyle = PAL.woodShadow;
    ctx.fillRect(1, 3, 20, 1);
    ctx.fillRect(1, 13, 20, 1);
    ctx.fillStyle = PAL.woodHi;
    ctx.fillRect(1, 4, 20, 1);

    // carved lines suggesting lettering
    ctx.fillStyle = PAL.woodShadow;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(4, 6, 14, 1);
    ctx.fillRect(4, 9, 10, 1);
    ctx.globalAlpha = 1;

    // arrow tip
    if (direction !== "none") {
      ctx.fillStyle = PAL.woodMid;
      ctx.beginPath();
      if (direction === "right") {
        ctx.moveTo(21, 3);
        ctx.lineTo(22, 8.5);
        ctx.lineTo(21, 14);
      } else {
        ctx.moveTo(1, 3);
        ctx.lineTo(0, 8.5);
        ctx.lineTo(1, 14);
      }
      ctx.closePath();
      ctx.fill();
    }
  });
}

export function fenceSegmentSprite(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`fence-${variant}`, { w: 16, h: 14 }, (ctx) => {
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 0.15;
    ctx.fillRect(1, 12, 14, 2);
    ctx.globalAlpha = 1;
    // posts
    shadedRect(ctx, 1, 3, 3, 10, PAL.woodBase, PAL.woodShadow, PAL.woodHi);
    shadedRect(ctx, 12, 3, 3, 10, PAL.woodBase, PAL.woodShadow, PAL.woodHi);
    // rails
    shadedRect(ctx, 0, 4, 16, 2, PAL.woodMid, PAL.woodShadow, PAL.woodPale);
    shadedRect(ctx, 0, 9, 16, 2, PAL.woodMid, PAL.woodShadow, PAL.woodPale);
  });
}

export function marketStallSprite(variant: number, accent: string): HTMLCanvasElement {
  return getProceduralBitmap(`stall-${variant}-${accent}`, { w: 48, h: 44 }, (ctx) => {
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(24, 42, 20, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // posts
    shadedRect(ctx, 3, 10, 4, 30, PAL.woodDark, PAL.woodShadow, PAL.woodBase);
    shadedRect(ctx, 41, 10, 4, 30, PAL.woodDark, PAL.woodShadow, PAL.woodBase);

    // canopy (striped cloth awning)
    const canopyY = 4;
    for (let x = 0; x < 48; x++) {
      const stripe = Math.floor(x / 6) % 2 === 0;
      ctx.fillStyle = stripe ? accent : PAL.clothCream;
      const droop = Math.round(Math.sin((x / 48) * Math.PI) * 2);
      ctx.fillRect(x, canopyY + droop, 1, 8);
    }
    ctx.fillStyle = PAL.woodShadow;
    ctx.fillRect(0, canopyY + 8, 48, 1);
    // scalloped edge
    for (let x = 0; x < 48; x += 4) {
      ctx.fillStyle = Math.floor(x / 6) % 2 === 0 ? accent : PAL.clothCream;
      const droop = Math.round(Math.sin((x / 48) * Math.PI) * 2);
      ctx.fillRect(x, canopyY + 8 + droop, 3, 2);
    }

    // counter table
    shadedRect(ctx, 4, 26, 40, 12, PAL.woodMid, PAL.woodShadow, PAL.woodPale);
    plankTexture(ctx, 4, 26, 40, 12, variant);
    ctx.fillStyle = PAL.woodShadow;
    ctx.fillRect(4, 26, 40, 1);

    // goods on the counter — baskets of produce, alternating colors
    const goods = [PAL.fruitRed, PAL.fruitOrange, PAL.cropYellow, PAL.leafBase, PAL.clothMaroon];
    for (let i = 0; i < 5; i++) {
      const gx = 7 + i * 7;
      const gColor = goods[i % goods.length];
      ctx.fillStyle = PAL.basketBase;
      ctx.fillRect(gx, 20, 6, 5);
      ctx.fillStyle = PAL.basketDark;
      ctx.fillRect(gx, 24, 6, 1);
      // produce mound
      ctx.fillStyle = gColor;
      ctx.fillRect(gx + 1, 16, 4, 4);
      ctx.fillRect(gx, 18, 6, 2);
      ctx.fillStyle = PAL.white;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(gx + 1, 16, 1, 1);
      ctx.globalAlpha = 1;
    }
  });
}

export function verandaRailSprite(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`verandarail-${variant}`, { w: 16, h: 20 }, (ctx) => {
    shadedRect(ctx, 1, 0, 3, 20, PAL.woodDark, PAL.woodShadow, PAL.woodBase);
    shadedRect(ctx, 12, 0, 3, 20, PAL.woodDark, PAL.woodShadow, PAL.woodBase);
    shadedRect(ctx, 0, 2, 16, 2, PAL.woodMid, PAL.woodShadow, PAL.woodPale);
    shadedRect(ctx, 0, 14, 16, 2, PAL.woodMid, PAL.woodShadow, PAL.woodPale);
    for (let x = 4; x < 12; x += 3) {
      shadedRect(ctx, x, 4, 1, 10, PAL.woodBase, PAL.woodShadow, PAL.woodHi);
    }
  });
}

export function waterPlatformSprite(): HTMLCanvasElement {
  return getProceduralBitmap("waterplatform", { w: 40, h: 16 }, (ctx) => {
    shadedRect(ctx, 0, 0, 40, 10, PAL.woodMid, PAL.woodShadow, PAL.woodPale);
    plankTexture(ctx, 0, 0, 40, 10, 3);
    for (let x = 3; x < 40; x += 8) {
      shadedRect(ctx, x, 9, 3, 7, PAL.woodDark, PAL.woodShadow, PAL.woodBase);
    }
  });
}

export function wellSprite(): HTMLCanvasElement {
  return getProceduralBitmap("well", { w: 26, h: 26 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(13, 24, 11, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // stone ring base
    ctx.fillStyle = PAL.stoneBase;
    ctx.beginPath();
    ctx.ellipse(13, 18, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.stoneShadow;
    ctx.beginPath();
    ctx.ellipse(13, 18, 11, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PAL.waterBase;
    ctx.beginPath();
    ctx.ellipse(13, 17, 7, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.waterHi;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(11, 16.3, 2.4, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // posts + roof
    shadedRect(ctx, 2, 0, 3, 15, PAL.woodDark, PAL.woodShadow, PAL.woodBase);
    shadedRect(ctx, 21, 0, 3, 15, PAL.woodDark, PAL.woodShadow, PAL.woodBase);
    ctx.fillStyle = PAL.thatchBase;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(13, -3);
    ctx.lineTo(26, 4);
    ctx.lineTo(26, 6);
    ctx.lineTo(13, 0);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();
  });
}
