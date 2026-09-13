import { PAL } from "../palette";
import { getProceduralBitmap, hashNoise } from "../pixelArt";
import { paintOrganicBlobs, type Blob } from "./organic";

const leafTones = { shadow: PAL.leafShadow, dark: PAL.leafDark, base: PAL.leafBase, mid: PAL.leafMid, hi: PAL.leafHi };

export function treeSprite(variant: number, kind: "round" | "tall" = "round"): HTMLCanvasElement {
  return getProceduralBitmap(`tree-${kind}-${variant}`, { w: 26, h: 34 }, (ctx) => {
    const cx = 13;
    const canopyY = kind === "round" ? 12 : 10;

    // ground contact shadow
    ctx.fillStyle = PAL.grassShadow;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(cx, 31, 9, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // trunk
    const trunkH = kind === "round" ? 10 : 14;
    const trunkTopY = 33 - trunkH;
    for (let y = trunkTopY; y < 32; y++) {
      const taper = (y - trunkTopY) / trunkH;
      const halfW = 1.6 + taper * 1.1;
      const left = Math.round(cx - halfW);
      const right = Math.round(cx + halfW);
      for (let x = left; x <= right; x++) {
        const rel = (x - left) / Math.max(1, right - left);
        ctx.fillStyle = rel < 0.35 ? PAL.trunkDark : rel < 0.75 ? PAL.trunkBase : PAL.trunkShadow;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // trunk bark texture flecks
    for (let i = 0; i < 6; i++) {
      const y = trunkTopY + Math.floor(hashNoise(i, variant, 3) * trunkH);
      ctx.fillStyle = PAL.trunkShadow;
      ctx.fillRect(cx - 1 + Math.floor(hashNoise(i, variant, 4) * 3), y, 1, 1);
    }

    // canopy: irregular cluster of overlapping blobs
    const blobs: Blob[] =
      kind === "round"
        ? [
            { dx: cx - 5, dy: canopyY - 1, rx: 7, ry: 6 },
            { dx: cx + 5, dy: canopyY, rx: 7.5, ry: 6.5 },
            { dx: cx, dy: canopyY - 6, rx: 8, ry: 7 },
            { dx: cx - 2, dy: canopyY + 4, rx: 7, ry: 5.5 },
          ]
        : [
            { dx: cx, dy: canopyY - 10, rx: 5, ry: 5.5 },
            { dx: cx - 3, dy: canopyY - 3, rx: 6, ry: 6 },
            { dx: cx + 3, dy: canopyY - 4, rx: 6, ry: 6 },
            { dx: cx, dy: canopyY + 4, rx: 6.5, ry: 6 },
          ];

    paintOrganicBlobs(ctx, 0, 0, blobs, leafTones, {
      seed: variant * 31 + 7,
      textureColor: PAL.leafHi,
      textureChance: 0.035,
    });

    // a few berry/blossom accents for visual richness (deterministic per variant)
    if (variant % 2 === 0) {
      for (let i = 0; i < 3; i++) {
        const bx = cx - 6 + Math.floor(hashNoise(i, variant, 44) * 12);
        const by = canopyY - 4 + Math.floor(hashNoise(i, variant, 55) * 8);
        ctx.fillStyle = PAL.fruitRed;
        ctx.fillRect(bx, by, 1, 1);
      }
    }
  });
}

export function bushSprite(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`bush-${variant}`, { w: 16, h: 12 }, (ctx) => {
    ctx.fillStyle = PAL.grassShadow;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(8, 11, 6, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const blobs: Blob[] = [
      { dx: 5, dy: 6, rx: 4.5, ry: 4 },
      { dx: 10, dy: 6.5, rx: 4.8, ry: 4.2 },
      { dx: 8, dy: 4, rx: 4.5, ry: 3.8 },
    ];
    paintOrganicBlobs(ctx, 0, 0, blobs, leafTones, {
      seed: variant * 17 + 2,
      textureColor: PAL.leafHi,
      textureChance: 0.05,
    });
  });
}

export function rockSprite(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`rock-${variant}`, { w: 12, h: 9 }, (ctx) => {
    ctx.fillStyle = PAL.stoneShadow;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(6, 8, 5, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    const tones = { shadow: PAL.stoneShadow, dark: PAL.stoneDark, base: PAL.stoneBase, mid: PAL.stoneMid, hi: PAL.stoneHi };
    paintOrganicBlobs(
      ctx,
      0,
      0,
      [
        { dx: 5, dy: 5, rx: 5, ry: 3.6 },
        { dx: 8, dy: 5.5, rx: 3.5, ry: 3 },
      ],
      tones,
      { seed: variant * 13 + 6 },
    );
  });
}

export function flowerClumpSprite(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`flowerclump-${variant}`, { w: 8, h: 8 }, (ctx) => {
    const stemX = 4;
    ctx.fillStyle = PAL.leafBase;
    ctx.fillRect(stemX, 4, 1, 3);
    ctx.fillRect(stemX - 2, 5, 1, 2);
    ctx.fillRect(stemX + 2, 5, 1, 2);
    const petalColors = [PAL.clothCream, PAL.fruitOrange, PAL.clothMustard, PAL.white, PAL.clothRed];
    const c = petalColors[variant % petalColors.length];
    const cx = stemX,
      cy = 3;
    ctx.fillStyle = c;
    ctx.fillRect(cx - 1, cy - 1, 3, 3);
    ctx.fillStyle = PAL.cropYellow;
    ctx.fillRect(cx, cy, 1, 1);
  });
}

export function tallGrassTuftSprite(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`grasstuft-${variant}`, { w: 8, h: 10 }, (ctx) => {
    const blades = 5;
    for (let i = 0; i < blades; i++) {
      const bx = 1 + i;
      const lean = Math.round(hashNoise(i, variant, 66) * 2) - 1;
      const h = 5 + Math.floor(hashNoise(i, variant, 77) * 4);
      for (let y = 0; y < h; y++) {
        const x = bx + Math.round((lean * y) / h);
        ctx.fillStyle = y < h * 0.4 ? PAL.grassHi : PAL.grassBase;
        ctx.fillRect(x, 9 - y, 1, 1);
      }
    }
  });
}

export function reedSprite(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`reed-${variant}`, { w: 6, h: 14 }, (ctx) => {
    for (let i = 0; i < 3; i++) {
      const bx = 1 + i * 2;
      const lean = Math.round(hashNoise(i, variant, 88) * 2) - 1;
      const h = 9 + Math.floor(hashNoise(i, variant, 99) * 4);
      for (let y = 0; y < h; y++) {
        const x = bx + Math.round((lean * y) / h);
        ctx.fillStyle = y < 3 ? PAL.cropYellow : PAL.leafBase;
        ctx.fillRect(x, 13 - y, 1, 1);
      }
    }
  });
}


/** A big, clustered canopy tree in the spirit of classic 16-bit forests. */
export function bigTreeSprite(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`bigtree-${variant}`, { w: 46, h: 62 }, (ctx) => {
    const cx = 23;
    ctx.fillStyle = PAL.grassShadow;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(cx, 59, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // trunk with root flare
    for (let y = 38; y < 60; y++) {
      const t = (y - 38) / 22;
      const halfW = 2.4 + t * 2.2 + (y > 55 ? (y - 55) * 1.2 : 0);
      const l = Math.round(cx - halfW);
      const r = Math.round(cx + halfW);
      for (let x = l; x <= r; x++) {
        const rel = (x - l) / Math.max(1, r - l);
        ctx.fillStyle = rel < 0.3 ? PAL.trunkBase : rel < 0.7 ? PAL.trunkDark : PAL.trunkShadow;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = PAL.trunkShadow;
    for (let i = 0; i < 8; i++) ctx.fillRect(cx - 2 + Math.floor(hashNoise(i, variant, 5) * 4), 40 + i * 2, 1, 1);

    // canopy: several distinct leaf clumps, each shaded, stacked into a crown
    const clumps: Blob[] = [
      { dx: cx, dy: 12, rx: 11, ry: 9 },
      { dx: cx - 12, dy: 22, rx: 10, ry: 8 },
      { dx: cx + 12, dy: 21, rx: 10, ry: 8 },
      { dx: cx - 5, dy: 31, rx: 11, ry: 8 },
      { dx: cx + 7, dy: 32, rx: 10, ry: 7.5 },
      { dx: cx, dy: 22, rx: 9, ry: 8 },
    ];
    for (const c of clumps) {
      paintOrganicBlobs(ctx, 0, 0, [c], leafTones, {
        seed: variant * 7 + Math.round(c.dx + c.dy),
        textureColor: PAL.leafHi,
        textureChance: 0.05,
      });
    }
    // clump separation so the crown reads as distinct masses
    ctx.fillStyle = PAL.leafShadow;
    ctx.globalAlpha = 0.5;
    for (const c of clumps.slice(1)) {
      for (let a = Math.PI * 0.15; a < Math.PI * 0.85; a += 0.25) {
        ctx.fillRect(Math.round(c.dx + Math.cos(a) * c.rx), Math.round(c.dy - Math.sin(a) * c.ry), 1, 1);
      }
    }
    ctx.globalAlpha = 1;
    if (variant % 2 === 0) {
      ctx.fillStyle = PAL.fruitRed;
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(
          cx - 14 + Math.floor(hashNoise(i, variant, 44) * 28),
          10 + Math.floor(hashNoise(i, variant, 55) * 24),
          2,
          2,
        );
      }
    }
  });
}

/** Tall conifer for the hillside edges. */
export function pineSprite(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`pine-${variant}`, { w: 26, h: 58 }, (ctx) => {
    const cx = 13;
    ctx.fillStyle = PAL.trunkDark;
    ctx.fillRect(cx - 2, 44, 4, 14);
    ctx.fillStyle = PAL.trunkShadow;
    ctx.fillRect(cx + 1, 44, 1, 14);
    const tiers = [
      { y: 44, w: 24 },
      { y: 34, w: 20 },
      { y: 24, w: 16 },
      { y: 14, w: 11 },
      { y: 6, w: 6 },
    ];
    for (const t of tiers) {
      for (let row = 0; row < 12; row++) {
        const y = t.y - row;
        const halfW = (t.w / 2) * (1 - row / 12);
        const l = Math.round(cx - halfW);
        const r = Math.round(cx + halfW);
        for (let x = l; x <= r; x++) {
          const rel = (x - l) / Math.max(1, r - l);
          ctx.fillStyle = rel < 0.25 ? PAL.leafMid : rel < 0.7 ? PAL.leafBase : PAL.leafDark;
          if (row === 0) ctx.fillStyle = PAL.leafShadow;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    ctx.fillStyle = PAL.leafHi;
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(
        cx - 8 + Math.floor(hashNoise(i, variant, 3) * 16),
        8 + Math.floor(hashNoise(i, variant, 4) * 36),
        1,
        1,
      );
    }
  });
}
