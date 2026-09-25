import { PAL } from "../palette";
import { getProceduralBitmap } from "../pixelArt";

/** 5x7 blocky letterforms — chunky enough to render as carved slabs. */
const GLYPHS: Record<string, string[]> = {
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
};

const BLOCK = 6;
const GAP = 2;
const WORD = "LOOM";

export interface Cell {
  x: number;
  y: number;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export function getLogoCells(): Cell[] {
  return cells();
}

function cells(): Cell[] {
  const out: Cell[] = [];
  const letterW = 5 * BLOCK;
  WORD.split("").forEach((ch, li) => {
    const glyph = GLYPHS[ch];
    if (!glyph) return;
    const ox = 4 + li * (letterW + BLOCK + GAP);
    for (let gy = 0; gy < glyph.length; gy++) {
      for (let gx = 0; gx < glyph[gy].length; gx++) {
        if (glyph[gy][gx] !== "1") continue;
        out.push({
          x: ox + gx * BLOCK,
          y: 3 + gy * BLOCK,
          up: glyph[gy - 1]?.[gx] === "1",
          down: glyph[gy + 1]?.[gx] === "1",
          left: glyph[gy][gx - 1] === "1",
          right: glyph[gy][gx + 1] === "1",
        });
      }
    }
  });
  return out;
}

/**
 * The LOOM wordmark, built from carved wooden slabs. Bevels are placed by looking at
 * each cell's neighbours, so a letter reads as one solid shape instead of a row of
 * separate boxes — and every shadow is laid down before any face, so slabs never
 * paint over each other.
 */
export function loomLogo(): HTMLCanvasElement {
  const letterW = 5 * BLOCK;
  const totalW = WORD.length * letterW + (WORD.length - 1) * (BLOCK + GAP) + 10;
  const totalH = 7 * BLOCK + 12;

  return getProceduralBitmap("logo-loom", { w: totalW, h: totalH }, (ctx) => {
    const list = cells();

    // pass 1 — every drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    for (const c of list) ctx.fillRect(c.x + 3, c.y + 4, BLOCK, BLOCK);

    // pass 2 — slab bodies
    ctx.fillStyle = PAL.thatchBase;
    for (const c of list) ctx.fillRect(c.x, c.y, BLOCK, BLOCK);

    // pass 3 — bevels and grain
    for (const c of list) {
      ctx.fillStyle = PAL.thatchHi;
      if (!c.up) ctx.fillRect(c.x, c.y, BLOCK, 1);
      if (!c.left) ctx.fillRect(c.x, c.y, 1, BLOCK);

      ctx.fillStyle = PAL.thatchShadow;
      if (!c.down) ctx.fillRect(c.x, c.y + BLOCK - 1, BLOCK, 1);
      if (!c.right) ctx.fillRect(c.x + BLOCK - 1, c.y, 1, BLOCK);

      ctx.fillStyle = PAL.thatchDark;
      ctx.fillRect(c.x + 2, c.y + 3, 3, 1);
      ctx.fillStyle = PAL.thatchMid;
      ctx.fillRect(c.x + 1, c.y + 1, 2, 1);
    }
  });
}

/** A small woven-thread motif used as the title screen's mark. */
export function loomMark(): HTMLCanvasElement {
  return getProceduralBitmap("logo-mark", { w: 24, h: 24 }, (ctx) => {
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(2, 2, 20, 20);
    ctx.fillStyle = PAL.woodMid;
    ctx.fillRect(3, 3, 18, 18);
    // warp threads
    ctx.fillStyle = PAL.frameCream;
    for (let x = 5; x < 20; x += 3) ctx.fillRect(x, 4, 1, 16);
    // weft threads, alternating over and under
    for (let y = 6; y < 20; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? PAL.clothRed : PAL.clothTeal;
      for (let x = 4; x < 21; x += 2) ctx.fillRect(x, y, 2, 1);
    }
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(2, 2, 20, 1);
    ctx.fillRect(2, 21, 20, 1);
    ctx.fillRect(2, 2, 1, 20);
    ctx.fillRect(21, 2, 1, 20);
  });
}
