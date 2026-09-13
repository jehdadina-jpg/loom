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

function poly(ctx: CanvasRenderingContext2D, pts: [number, number][], fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

/**
 * A village house in three-quarter view: a lit front wall, a receding side wall in
 * shadow, a gable roof whose top plane catches the light, deep eaves, chimney, shuttered
 * window with a flower box, painted door with stone steps and cloth under the eave.
 */
export function houseSprite(opts: HouseOptions): HTMLCanvasElement {
  const w = opts.width ?? 96;
  const d = Math.round(w * 0.3); // depth of the side wall
  const fw = w - d; // front wall width
  const h = 104;
  const rise = Math.round(d * 0.45); // how far the side recedes upward
  const key = `house3q-${opts.variant}-${w}-${opts.roofColor}-${opts.withStilts}-${opts.accent ?? "n"}`;
  return getProceduralBitmap(key, { w: w + 10, h }, (ctx) => {
    const accent = opts.accent ?? PAL.clothTeal;
    const stiltH = opts.withStilts === false ? 0 : 12;
    const wallTop = 44;
    const wallBottom = h - 6 - stiltH;
    const wallH = wallBottom - wallTop;
    const isThatch = (opts.roofColor ?? "thatch") === "thatch";
    const roofDark = isThatch ? PAL.thatchShadow : PAL.roofSlateShadow;
    const roofBase = isThatch ? PAL.thatchBase : PAL.roofSlateBase;
    const roofMid = isThatch ? PAL.thatchMid : PAL.roofSlateMid;
    const roofHi = isThatch ? PAL.thatchHi : PAL.roofSlateDark;
    const peakY = 8;
    const ov = 8; // eave overhang

    // ground shadow, offset toward the receding side
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 0.26;
    ctx.beginPath();
    ctx.ellipse(w / 2 + 4, h - 3, w * 0.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // stilts: front row and the receding side row
    if (stiltH > 0) {
      const posts: [number, number][] = [
        [6, wallBottom],
        [fw / 2 - 3, wallBottom],
        [fw - 8, wallBottom],
        [w - 6, wallBottom - rise],
        [fw + d / 2 - 2, wallBottom - rise / 2],
      ];
      for (const [sx, sy] of posts) {
        shadedRect(ctx, sx, sy, 5, stiltH + 2, PAL.woodDark, PAL.woodShadow, PAL.woodBase);
        ctx.fillStyle = PAL.stoneBase;
        ctx.fillRect(sx - 1, sy + stiltH, 7, 2);
      }
    }

    // ---- side wall (in shadow), receding up and to the right
    poly(
      ctx,
      [
        [fw, wallTop],
        [w, wallTop - rise],
        [w, wallBottom - rise],
        [fw, wallBottom],
      ],
      PAL.woodDark,
    );
    // diagonal plank lines following the recession
    ctx.fillStyle = PAL.woodShadow;
    ctx.globalAlpha = 0.6;
    for (let i = 1; i < 7; i++) {
      const t = i / 7;
      const y0 = wallTop + wallH * t;
      const y1 = wallTop - rise + wallH * t;
      ctx.beginPath();
      ctx.moveTo(fw, y0);
      ctx.lineTo(w, y1);
      ctx.lineTo(w, y1 + 1);
      ctx.lineTo(fw, y0 + 1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // small side window
    poly(
      ctx,
      [
        [fw + d * 0.35, wallTop + 10 - rise * 0.35],
        [fw + d * 0.65, wallTop + 10 - rise * 0.65],
        [fw + d * 0.65, wallTop + 20 - rise * 0.65],
        [fw + d * 0.35, wallTop + 20 - rise * 0.35],
      ],
      "#ffd88f",
    );

    // ---- front wall (lit)
    shadedRect(ctx, 0, wallTop, fw, wallH, PAL.woodBase, PAL.woodShadow, PAL.woodHi);
    plankTexture(ctx, 0, wallTop, fw, wallH, opts.variant);
    ctx.fillStyle = PAL.woodShadow;
    ctx.globalAlpha = 0.3;
    for (let y = wallTop + 6; y < wallBottom; y += 7) ctx.fillRect(0, y, fw, 1);
    ctx.globalAlpha = 1;
    shadedRect(ctx, 0, wallTop - 2, 4, wallH + 2, PAL.woodDark, PAL.woodShadow, PAL.woodBase);
    shadedRect(ctx, fw - 3, wallTop - 2, 4, wallH + 2, PAL.woodShadow, PAL.woodShadow, PAL.woodDark);
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(0, wallBottom - 3, fw, 3);

    // window with shutters + flower box
    const winW = 14;
    const winH = 12;
    const winX = Math.round(fw * 0.16);
    const winY = wallTop + 9;
    ctx.fillStyle = PAL.frameCream;
    ctx.fillRect(winX - 2, winY - 2, winW + 4, winH + 4);
    ctx.fillStyle = PAL.woodShadow;
    ctx.fillRect(winX - 1, winY - 1, winW + 2, winH + 2);
    ctx.fillStyle = PAL.skyMid;
    ctx.fillRect(winX, winY, winW, winH);
    ctx.fillStyle = "#ffe9b8";
    ctx.fillRect(winX + 1, winY + 1, 5, 4);
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(winX + winW / 2 - 0.5, winY, 1, winH);
    ctx.fillRect(winX, winY + winH / 2 - 0.5, winW, 1);
    ctx.fillStyle = accent;
    ctx.fillRect(winX - 6, winY - 1, 4, winH + 2);
    ctx.fillRect(winX + winW + 2, winY - 1, 4, winH + 2);
    ctx.fillStyle = PAL.woodMid;
    ctx.fillRect(winX - 3, winY + winH + 2, winW + 6, 4);
    ctx.fillStyle = PAL.woodShadow;
    ctx.fillRect(winX - 3, winY + winH + 5, winW + 6, 1);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = [PAL.fruitRed, PAL.clothMustard, PAL.fruitOrange][i % 3];
      ctx.fillRect(winX - 1 + i * 4, winY + winH, 2, 2);
      ctx.fillStyle = PAL.leafBase;
      ctx.fillRect(winX + i * 4, winY + winH + 2, 1, 1);
    }

    // door + steps
    const doorW = 18;
    const doorH = wallH - 10;
    const doorX = Math.round(fw * 0.58);
    const doorY = wallBottom - doorH;
    ctx.fillStyle = PAL.frameCream;
    ctx.fillRect(doorX - 3, doorY - 3, doorW + 6, doorH + 3);
    ctx.fillStyle = PAL.doorShadow;
    ctx.fillRect(doorX - 1, doorY - 1, doorW + 2, doorH + 1);
    shadedRect(ctx, doorX, doorY, doorW, doorH, PAL.doorMid, PAL.doorShadow, PAL.doorHi);
    ctx.fillStyle = PAL.doorShadow;
    ctx.globalAlpha = 0.7;
    for (let px = doorX + 4; px < doorX + doorW; px += 5) ctx.fillRect(px, doorY, 1, doorH);
    ctx.fillRect(doorX, doorY + Math.round(doorH * 0.45), doorW, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.clothMustard;
    ctx.fillRect(doorX + doorW - 5, doorY + doorH / 2, 2, 3);
    for (let i = 0; i < 3; i++) {
      shadedRect(ctx, doorX - 4 + i * 2, wallBottom + i * 3, doorW + 8 - i * 4, 3, PAL.stoneBase, PAL.stoneShadow, PAL.stoneHi);
    }

    // cloth under the eave
    for (let x = 6; x < fw - 6; x += 9) {
      ctx.fillStyle = (x / 9) % 2 === 0 ? accent : PAL.clothCream;
      ctx.fillRect(x, wallTop - 1, 7, 5);
    }
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(0, wallTop - 4, fw, 3);

    // ---- roof: the side plane (top face, catches light) then the front gable
    const ridgeX = fw / 2;
    const eaveY = wallTop - 3;
    // side plane: from the ridge back to the far corner
    poly(
      ctx,
      [
        [ridgeX, peakY],
        [ridgeX + d, peakY - rise],
        [w + ov, eaveY - rise],
        [fw + ov, eaveY],
      ],
      roofMid,
    );
    // thatch rows across the side plane
    ctx.fillStyle = roofDark;
    ctx.globalAlpha = 0.55;
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const ax = ridgeX + (fw + ov - ridgeX) * t;
      const ay = peakY + (eaveY - peakY) * t;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + d, ay - rise);
      ctx.lineTo(ax + d, ay - rise + 1);
      ctx.lineTo(ax, ay + 1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = roofHi;
    ctx.globalAlpha = 0.5;
    poly(
      ctx,
      [
        [ridgeX, peakY],
        [ridgeX + d, peakY - rise],
        [ridgeX + d + 3, peakY - rise + 3],
        [ridgeX + 3, peakY + 3],
      ],
      roofHi,
    );
    ctx.globalAlpha = 1;

    // front gable slope, layered thatch
    for (let y = peakY; y <= eaveY; y++) {
      const t = (y - peakY) / (eaveY - peakY);
      const halfW = t * (fw / 2 + ov);
      const left = Math.round(ridgeX - halfW);
      const right = Math.round(ridgeX + halfW);
      const layer = Math.floor((y - peakY) / 6);
      for (let x = left; x <= right; x++) {
        const rel = (x - left) / Math.max(1, right - left);
        let c: string;
        if (rel < 0.08) c = roofHi;
        else if (rel < 0.5) c = layer % 2 === 0 ? roofBase : roofMid;
        else if (rel < 0.9) c = layer % 2 === 0 ? roofMid : roofBase;
        else c = roofDark;
        if ((y - peakY) % 6 === 5) c = roofDark;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // eave fringe + ridge cap
    ctx.fillStyle = roofDark;
    for (let x = Math.round(ridgeX - fw / 2 - ov); x < fw + ov; x += 3) {
      ctx.fillRect(Math.max(0, x), eaveY + 1, 2, 2 + (x % 2 ? 1 : 0));
    }
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(ridgeX - 2, peakY - 1, 5, 3);
    for (let i = 0; i < 22; i++) {
      const fx = Math.floor(hashNoise(i, opts.variant, 3) * fw);
      const fy = peakY + Math.floor(hashNoise(i, opts.variant, 4) * (eaveY - peakY));
      ctx.fillStyle = roofDark;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(fx, fy, 2, 1);
      ctx.globalAlpha = 1;
    }

    // chimney on the side plane
    const chX = Math.round(ridgeX + d * 0.55);
    const chY = Math.round(peakY - rise * 0.55) - 12;
    ctx.fillStyle = PAL.stoneDark;
    ctx.fillRect(chX, chY, 8, 18);
    ctx.fillStyle = PAL.stoneBase;
    ctx.fillRect(chX + 1, chY + 1, 3, 17);
    ctx.fillStyle = PAL.stoneShadow;
    ctx.fillRect(chX, chY, 8, 2);
    ctx.fillStyle = PAL.stoneHi;
    ctx.fillRect(chX + 1, chY + 1, 6, 1);

    // eave shadow on the front wall gives the overhang depth
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.2;
    ctx.fillRect(0, wallTop - 1, fw, 4);
    ctx.globalAlpha = 1;
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

export function marketStallSprite(variant: number, accent: string, frame: 0 | 1 = 0): HTMLCanvasElement {
  return getProceduralBitmap(`stall-${variant}-${accent}-${frame}`, { w: 58, h: 46 }, (ctx) => {
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.ellipse(27, 44, 24, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // receding side of the counter and awning
    poly(ctx, [[46, 28], [56, 24], [56, 36], [46, 40]], PAL.woodDark);
    poly(ctx, [[46, 4], [56, 1], [56, 11], [46, 14]], PAL.woodShadow);

    // posts
    shadedRect(ctx, 3, 12, 4, 30, PAL.woodDark, PAL.woodShadow, PAL.woodBase);
    shadedRect(ctx, 42, 12, 4, 30, PAL.woodDark, PAL.woodShadow, PAL.woodBase);
    shadedRect(ctx, 52, 8, 3, 26, PAL.woodShadow, PAL.woodShadow, PAL.woodDark);

    // striped awning with a fluttering scalloped edge
    const canopyY = 4;
    for (let x = 0; x < 48; x++) {
      const stripe = Math.floor(x / 6) % 2 === 0;
      ctx.fillStyle = stripe ? accent : PAL.clothCream;
      const droop = Math.round(Math.sin((x / 48) * Math.PI) * 2);
      ctx.fillRect(x, canopyY + droop, 1, 8);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      if (x % 6 === 5) ctx.fillRect(x, canopyY + droop, 1, 8);
    }
    ctx.fillStyle = PAL.woodShadow;
    ctx.fillRect(0, canopyY + 8, 48, 1);
    for (let x = 0; x < 48; x += 4) {
      ctx.fillStyle = Math.floor(x / 6) % 2 === 0 ? accent : PAL.clothCream;
      const droop = Math.round(Math.sin((x / 48) * Math.PI) * 2) + (frame === 1 && (x / 4) % 2 === 0 ? 1 : 0);
      ctx.fillRect(x, canopyY + 8 + droop, 3, 2);
    }

    // counter with front and top face
    shadedRect(ctx, 4, 28, 42, 12, PAL.woodMid, PAL.woodShadow, PAL.woodPale);
    plankTexture(ctx, 4, 28, 42, 12, variant);
    ctx.fillStyle = PAL.woodHi;
    ctx.fillRect(4, 27, 42, 2);

    // goods
    const goods = [PAL.fruitRed, PAL.fruitOrange, PAL.cropYellow, PAL.leafBase, PAL.clothMaroon];
    for (let i = 0; i < 5; i++) {
      const gx = 7 + i * 7;
      ctx.fillStyle = PAL.basketBase;
      ctx.fillRect(gx, 22, 6, 5);
      ctx.fillStyle = PAL.basketDark;
      ctx.fillRect(gx, 26, 6, 1);
      ctx.fillStyle = goods[i % goods.length];
      ctx.fillRect(gx + 1, 18, 4, 4);
      ctx.fillRect(gx, 20, 6, 2);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(gx + 1, 18, 1, 1);
    }
    // hanging lantern under the awning
    ctx.fillStyle = PAL.stoneDark;
    ctx.fillRect(38, 13, 4, 6);
    ctx.fillStyle = "#ffd08a";
    ctx.fillRect(39, 14, 2, 4);
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
