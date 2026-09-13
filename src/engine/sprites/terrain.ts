import { PAL } from "../palette";
import { getProceduralBitmap, hashNoise } from "../pixelArt";

export const TILE = 16;

/**
 * Ground texture is intentionally LOW contrast: a base fill plus a handful of
 * 2x2 clusters within a narrow value range. Busy, high-contrast terrain is what
 * makes characters and props disappear into the floor, so this stays quiet.
 */
function quietFill(
  ctx: CanvasRenderingContext2D,
  base: string,
  dark: string,
  mid: string,
  hi: string,
  seed: number,
  density = 0.16,
) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TILE, TILE);

  for (let y = 0; y < TILE; y += 2) {
    for (let x = 0; x < TILE; x += 2) {
      const n = hashNoise(x, y, seed);
      let c: string | null = null;
      if (n < density * 0.45) c = dark;
      else if (n < density * 0.8) c = mid;
      else if (n < density) c = hi;
      if (c) {
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
}

export function grassTile(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`grass-${variant}`, { w: TILE, h: TILE }, (ctx) => {
    quietFill(ctx, PAL.grassBase, PAL.grassDark, PAL.grassMid, PAL.grassHi, variant * 17 + 1, 0.18);
    // a couple of short blade marks — sparse, so the field reads as texture not noise
    if (variant % 2 === 0) {
      const bx = 2 + Math.floor(hashNoise(variant, 3, 55) * 10);
      const by = 3 + Math.floor(hashNoise(variant, 5, 77) * 9);
      ctx.fillStyle = PAL.grassHi;
      ctx.fillRect(bx, by, 1, 2);
      ctx.fillRect(bx + 2, by + 1, 1, 2);
    }
  });
}

export function flowerGrassTile(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`flowergrass-${variant}`, { w: TILE, h: TILE }, (ctx) => {
    quietFill(ctx, PAL.grassBase, PAL.grassDark, PAL.grassMid, PAL.grassHi, variant * 13 + 3, 0.16);
    const colors = [PAL.clothCream, PAL.fruitOrange, PAL.clothMustard, PAL.white];
    for (let i = 0; i < 3; i++) {
      const fx = Math.floor(hashNoise(i, variant, 21) * (TILE - 3)) + 1;
      const fy = Math.floor(hashNoise(i, variant, 31) * (TILE - 3)) + 1;
      ctx.fillStyle = PAL.grassShadow;
      ctx.fillRect(fx, fy + 1, 2, 1);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(fx, fy, 2, 1);
    }
  });
}

export function dirtTile(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`dirt-${variant}`, { w: TILE, h: TILE }, (ctx) => {
    quietFill(ctx, PAL.dirtBase, PAL.dirtDark, PAL.dirtMid, PAL.dirtHi, variant * 23 + 5, 0.2);
  });
}

export function pathTile(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`path-${variant}`, { w: TILE, h: TILE }, (ctx) => {
    quietFill(ctx, PAL.dirtMid, PAL.dirtBase, PAL.dirtHi, PAL.dirtFleck, variant * 31 + 9, 0.22);
    // scattered pebbles give the walking surface a little life
    if (variant % 3 === 0) {
      const px = 3 + Math.floor(hashNoise(variant, 2, 61) * 9);
      const py = 4 + Math.floor(hashNoise(variant, 4, 62) * 8);
      ctx.fillStyle = PAL.stoneBase;
      ctx.fillRect(px, py, 2, 1);
      ctx.fillStyle = PAL.stoneShadow;
      ctx.fillRect(px, py + 1, 2, 1);
    }
  });
}

/** Grass tile with a band of path along one side — used where a path meets grass. */
export function pathEdgeTile(side: "top" | "bottom" | "left" | "right", variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`pathedge-${side}-${variant}`, { w: TILE, h: TILE }, (ctx) => {
    quietFill(ctx, PAL.grassBase, PAL.grassDark, PAL.grassMid, PAL.grassHi, variant * 41 + 2, 0.16);
    const t = 6;
    const paint = (x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = PAL.dirtMid;
      ctx.fillRect(x, y, w, h);
    };
    if (side === "top") paint(0, 0, TILE, t);
    if (side === "bottom") paint(0, TILE - t, TILE, t);
    if (side === "left") paint(0, 0, t, TILE);
    if (side === "right") paint(TILE - t, 0, t, TILE);
    // soft grassy fringe where the two surfaces meet
    ctx.fillStyle = PAL.grassDark;
    if (side === "top") for (let x = 0; x < TILE; x += 3) ctx.fillRect(x, t - 1, 2, 1);
    if (side === "bottom") for (let x = 1; x < TILE; x += 3) ctx.fillRect(x, TILE - t, 2, 1);
    if (side === "left") for (let y = 0; y < TILE; y += 3) ctx.fillRect(t - 1, y, 1, 2);
    if (side === "right") for (let y = 1; y < TILE; y += 3) ctx.fillRect(TILE - t, y, 1, 2);
  });
}

export function waterTile(frame: number): HTMLCanvasElement {
  return getProceduralBitmap(`water-${frame}`, { w: TILE, h: TILE }, (ctx) => {
    ctx.fillStyle = PAL.waterBase;
    ctx.fillRect(0, 0, TILE, TILE);
    for (let y = 0; y < TILE; y += 2) {
      for (let x = 0; x < TILE; x += 2) {
        const n = hashNoise(x, y + frame * 3, 12);
        if (n < 0.14) {
          ctx.fillStyle = PAL.waterDark;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }
    for (let y = 0; y < TILE; y += 4) {
      const offset = (frame * 2 + y) % TILE;
      ctx.fillStyle = PAL.waterMid;
      ctx.fillRect((offset + 1) % TILE, y, 4, 1);
    }
    ctx.fillStyle = PAL.waterHi;
    const fx = (frame * 5) % TILE;
    ctx.fillRect(fx, 3, 2, 1);
    ctx.fillRect((fx + 8) % TILE, 11, 2, 1);
  });
}

export function waterEdgeTile(side: "top" | "bottom" | "left" | "right", frame: number): HTMLCanvasElement {
  return getProceduralBitmap(`wateredge-${side}-${frame}`, { w: TILE, h: TILE }, (ctx) => {
    ctx.drawImage(waterTile(frame), 0, 0);
    const t = 4;
    const bank = (x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = PAL.grassBase;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = PAL.grassDark;
    };
    if (side === "top") {
      bank(0, 0, TILE, t);
      for (let x = 0; x < TILE; x += 3) ctx.fillRect(x, t - 1, 2, 1);
      ctx.fillStyle = PAL.waterFoam;
      ctx.fillRect(0, t, TILE, 1);
    }
    if (side === "bottom") {
      bank(0, TILE - t, TILE, t);
      ctx.fillStyle = PAL.waterFoam;
      ctx.fillRect(0, TILE - t - 1, TILE, 1);
    }
    if (side === "left") {
      bank(0, 0, t, TILE);
      ctx.fillStyle = PAL.waterFoam;
      ctx.fillRect(t, 0, 1, TILE);
    }
    if (side === "right") {
      bank(TILE - t, 0, t, TILE);
      ctx.fillStyle = PAL.waterFoam;
      ctx.fillRect(TILE - t - 1, 0, 1, TILE);
    }
  });
}

export function soilTile(variant: number, wet = false): HTMLCanvasElement {
  return getProceduralBitmap(`soil-${variant}-${wet}`, { w: TILE, h: TILE }, (ctx) => {
    const base = wet ? PAL.soilDark : PAL.soilBase;
    quietFill(ctx, base, PAL.soilShadow, PAL.soilMid, PAL.soilHi, variant * 19 + 8, 0.2);
    ctx.fillStyle = PAL.soilShadow;
    ctx.globalAlpha = 0.4;
    for (let y = 3; y < TILE; y += 6) ctx.fillRect(0, y, TILE, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.soilHi;
    ctx.globalAlpha = 0.35;
    for (let y = 4; y < TILE; y += 6) ctx.fillRect(0, y, TILE, 1);
    ctx.globalAlpha = 1;
  });
}

export function stoneFloorTile(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`stonefloor-${variant}`, { w: TILE, h: TILE }, (ctx) => {
    quietFill(ctx, PAL.stoneBase, PAL.stoneDark, PAL.stoneMid, PAL.stoneHi, variant * 29 + 4, 0.16);
    ctx.fillStyle = PAL.stoneShadow;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, TILE, 1);
    ctx.fillRect(0, 0, 1, TILE);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.stoneHi;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(1, 1, TILE - 2, 1);
    ctx.globalAlpha = 1;
  });
}

export function woodFloorTile(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`woodfloor-${variant}`, { w: TILE, h: TILE }, (ctx) => {
    ctx.fillStyle = PAL.woodBase;
    ctx.fillRect(0, 0, TILE, TILE);
    for (let y = 0; y < TILE; y++) {
      const n = hashNoise(0, y, variant * 7);
      ctx.fillStyle = n < 0.35 ? PAL.woodMid : PAL.woodDark;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, y, TILE, 1);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = PAL.woodShadow;
    ctx.fillRect(0, 0, TILE, 1);
    const seam = (variant % 2) * 8;
    ctx.fillRect(seam, 0, 1, TILE);
    ctx.fillStyle = PAL.woodHi;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, 1, TILE, 1);
    ctx.globalAlpha = 1;
  });
}
