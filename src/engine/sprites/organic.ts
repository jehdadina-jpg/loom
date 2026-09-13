import { hashNoise } from "../pixelArt";

export interface Blob {
  dx: number;
  dy: number;
  rx: number;
  ry: number;
}

export interface ToneSet {
  shadow: string;
  dark: string;
  base: string;
  mid: string;
  hi: string;
}

/**
 * Paints a union of soft elliptical blobs with directional (top-left) lighting,
 * an outline-darkened silhouette edge, and optional texture speckle.
 * This is the shared technique behind tree canopies, bushes, rocks and animal bodies —
 * it produces rounded, irregular, naturally-shaded forms instead of flat fills.
 */
export function paintOrganicBlobs(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  blobs: Blob[],
  tones: ToneSet,
  opts?: { seed?: number; textureColor?: string; textureChance?: number; outline?: string },
) {
  const seed = opts?.seed ?? 0;
  // bounding box
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const b of blobs) {
    minX = Math.min(minX, b.dx - b.rx);
    maxX = Math.max(maxX, b.dx + b.rx);
    minY = Math.min(minY, b.dy - b.ry);
    maxY = Math.max(maxY, b.dy + b.ry);
  }
  minX = Math.floor(minX) - 1;
  minY = Math.floor(minY) - 1;
  maxX = Math.ceil(maxX) + 1;
  maxY = Math.ceil(maxY) + 1;

  const lightX = -0.7,
    lightY = -0.7;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // find the closest blob (by normalized distance) that contains this pixel
      let best: { nd: number; ndx: number; ndy: number } | null = null;
      for (const b of blobs) {
        const ndx = (x - b.dx) / b.rx;
        const ndy = (y - b.dy) / b.ry;
        const nd = Math.sqrt(ndx * ndx + ndy * ndy);
        if (nd <= 1 && (!best || nd < best.nd)) {
          best = { nd, ndx, ndy };
        }
      }
      if (!best) continue;

      const dot = best.ndx * -lightX + best.ndy * -lightY; // >0 = toward light (highlight side)
      const edge = best.nd; // 0 center .. 1 edge

      let color: string;
      if (edge > 0.88) {
        color = tones.shadow; // silhouette outline
      } else if (dot < -0.55) {
        color = tones.shadow;
      } else if (dot < -0.15) {
        color = tones.dark;
      } else if (dot < 0.2) {
        color = tones.base;
      } else if (dot < 0.55) {
        color = tones.mid;
      } else {
        color = tones.hi;
      }

      if (opts?.textureColor && hashNoise(x, y, seed + 500) < (opts.textureChance ?? 0.04)) {
        color = opts.textureColor;
      }

      ctx.fillStyle = color;
      ctx.fillRect(originX + (x - minX), originY + (y - minY), 1, 1);
    }
  }

  return { w: maxX - minX + 1, h: maxY - minY + 1, minX, minY };
}

export function organicBounds(blobs: Blob[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const b of blobs) {
    minX = Math.min(minX, b.dx - b.rx);
    maxX = Math.max(maxX, b.dx + b.rx);
    minY = Math.min(minY, b.dy - b.ry);
    maxY = Math.max(maxY, b.dy + b.ry);
  }
  return {
    w: Math.ceil(maxX) - Math.floor(minX) + 3,
    h: Math.ceil(maxY) - Math.floor(minY) + 3,
  };
}
