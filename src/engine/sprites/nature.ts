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
