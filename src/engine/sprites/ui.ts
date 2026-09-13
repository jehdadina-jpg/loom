import { PAL } from "../palette";

let woodFrameUrl: string | null = null;
let parchmentFrameUrl: string | null = null;

function drawFrame(ctx: CanvasRenderingContext2D, size: number, t: number, colors: {
  hi: string; base: string; mid: string; shadow: string; fill: string; fillShadow: string;
}) {
  ctx.fillStyle = colors.fill;
  ctx.fillRect(0, 0, size, size);
  // subtle fill texture bands
  for (let y = t; y < size - t; y += 3) {
    ctx.fillStyle = colors.fillShadow;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(t, y, size - t * 2, 1);
    ctx.globalAlpha = 1;
  }

  // border bands: hi outer edge -> base -> shadow inner edge
  ctx.fillStyle = colors.base;
  ctx.fillRect(0, 0, size, t);
  ctx.fillRect(0, size - t, size, t);
  ctx.fillRect(0, 0, t, size);
  ctx.fillRect(size - t, 0, t, size);

  ctx.fillStyle = colors.hi;
  ctx.fillRect(0, 0, size, 2);
  ctx.fillRect(0, 0, 2, size);

  ctx.fillStyle = colors.shadow;
  ctx.fillRect(0, size - 2, size, 2);
  ctx.fillRect(size - 2, 0, 2, size);
  ctx.fillRect(t - 2, t - 2, size - (t - 2) * 2, 2);
  ctx.fillRect(t - 2, t - 2, 2, size - (t - 2) * 2);

  // corner studs
  ctx.fillStyle = colors.shadow;
  const studs = [
    [3, 3],
    [size - 6, 3],
    [3, size - 6],
    [size - 6, size - 6],
  ];
  for (const [x, y] of studs) {
    ctx.fillRect(x, y, 3, 3);
    ctx.fillStyle = colors.hi;
    ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = colors.shadow;
  }

  // plank seams along the border
  ctx.fillStyle = colors.shadow;
  ctx.globalAlpha = 0.4;
  for (let x = t + 6; x < size - t; x += 10) {
    ctx.fillRect(x, 1, 1, t - 2);
    ctx.fillRect(x, size - t + 1, 1, t - 2);
  }
  for (let y = t + 6; y < size - t; y += 10) {
    ctx.fillRect(1, y, t - 2, 1);
    ctx.fillRect(size - t + 1, y, t - 2, 1);
  }
  ctx.globalAlpha = 1;
}

/** A wooden nine-slice frame (dark carved border, warm wood fill) as a data URL for CSS border-image. */
export function woodFrameDataUrl(): string {
  if (woodFrameUrl) return woodFrameUrl;
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  drawFrame(ctx, size, 14, {
    hi: PAL.woodHi,
    base: PAL.woodBase,
    mid: PAL.woodMid,
    shadow: PAL.woodShadow,
    fill: PAL.woodMid,
    fillShadow: PAL.woodShadow,
  });
  woodFrameUrl = canvas.toDataURL();
  return woodFrameUrl;
}

/** A parchment/cloth nine-slice frame — used for dialogue + informational panels. */
export function parchmentFrameDataUrl(): string {
  if (parchmentFrameUrl) return parchmentFrameUrl;
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  drawFrame(ctx, size, 14, {
    hi: PAL.woodPale,
    base: PAL.woodBase,
    mid: PAL.woodMid,
    shadow: PAL.woodDark,
    fill: "#f3e3c3",
    fillShadow: "#dcc79c",
  });
  parchmentFrameUrl = canvas.toDataURL();
  return parchmentFrameUrl;
}
