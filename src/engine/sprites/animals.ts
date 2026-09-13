import { PAL } from "../palette";
import { getProceduralBitmap } from "../pixelArt";
import { paintOrganicBlobs, type Blob } from "./organic";

export function chickenSprite(frame: 0 | 1): HTMLCanvasElement {
  return getProceduralBitmap(`chicken-${frame}`, { w: 14, h: 13 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(7, 11.5, 4.5, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const bodyTones = { shadow: "#c9a86e", dark: "#e8cf9a", base: PAL.clothCream, mid: "#fff6e6", hi: PAL.white };
    const blobs: Blob[] = [
      { dx: 7, dy: 8, rx: 4.5, ry: 3.6 },
      { dx: 10, dy: 6, rx: 2.6, ry: 2.4 },
    ];
    paintOrganicBlobs(ctx, 0, 0, blobs, bodyTones, { seed: frame * 5 });

    // comb + beak
    ctx.fillStyle = PAL.fruitRed;
    ctx.fillRect(10, 3, 1, 2);
    ctx.fillStyle = PAL.cropYellow;
    ctx.fillRect(12, 5, 2, 1);
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(10, 5, 1, 1);

    // legs
    ctx.fillStyle = PAL.cropYellow;
    const legOffset = frame === 1 ? 1 : 0;
    ctx.fillRect(5 - legOffset, 11, 1, 2);
    ctx.fillRect(8 + legOffset, 11, 1, 2);

    // tail feathers
    ctx.fillStyle = PAL.clothCream;
    ctx.fillRect(1, 5, 2, 3);
    ctx.fillStyle = PAL.stoneBase;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(1, 5, 1, 1);
    ctx.globalAlpha = 1;
  });
}

export function dogSprite(frame: 0 | 1): HTMLCanvasElement {
  return getProceduralBitmap(`dog-${frame}`, { w: 22, h: 16 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(11, 14.5, 8, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const tones = { shadow: "#8a6a42", dark: "#a9835a", base: "#c49a68", mid: "#d9b380", hi: "#efd3a3" };
    const blobs: Blob[] = [
      { dx: 10, dy: 9, rx: 7, ry: 4 },
      { dx: 17, dy: 6.5, rx: 3.6, ry: 3.2 },
    ];
    paintOrganicBlobs(ctx, 0, 0, blobs, tones, { seed: frame * 9, textureColor: tones.dark, textureChance: 0.03 });

    // ears
    ctx.fillStyle = tones.shadow;
    ctx.fillRect(15, 3, 2, 3);
    ctx.fillRect(19, 3, 2, 3);
    // snout + nose
    ctx.fillStyle = tones.mid;
    ctx.fillRect(20, 6, 2, 2);
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(21, 7, 1, 1);
    // eye
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(17, 5, 1, 1);
    // legs
    const shift = frame === 1 ? 1 : 0;
    ctx.fillStyle = tones.shadow;
    ctx.fillRect(6 - shift, 12, 2, 3);
    ctx.fillRect(13 + shift, 12, 2, 3);
    // tail
    ctx.fillStyle = tones.base;
    ctx.fillRect(1, 5 + (frame === 1 ? -1 : 0), 3, 2);
  });
}

export function goatSprite(frame: 0 | 1): HTMLCanvasElement {
  return getProceduralBitmap(`goat-${frame}`, { w: 24, h: 20 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(12, 18.5, 9, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const tones = { shadow: "#c9c4bb", dark: "#dedad0", base: "#eeeae0", mid: "#f7f4ec", hi: PAL.white };
    const blobs: Blob[] = [
      { dx: 11, dy: 10, rx: 8, ry: 4.6 },
      { dx: 19, dy: 7, rx: 3.8, ry: 3.4 },
    ];
    paintOrganicBlobs(ctx, 0, 0, blobs, tones, { seed: frame * 11 });

    // ears + horns
    ctx.fillStyle = tones.shadow;
    ctx.fillRect(17, 3, 1, 3);
    ctx.fillRect(21, 3, 1, 3);
    ctx.fillStyle = PAL.dirtHi;
    ctx.fillRect(18, 4, 2, 2);
    ctx.fillRect(20, 5, 2, 2);
    // eye + nose
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(20, 7, 1, 1);
    ctx.fillRect(23, 8, 1, 1);
    // legs
    const shift = frame === 1 ? 1 : 0;
    ctx.fillStyle = tones.shadow;
    ctx.fillRect(5 - shift, 15, 2, 4);
    ctx.fillRect(9 + shift, 15, 2, 4);
    ctx.fillRect(14 - shift, 15, 2, 4);
    ctx.fillRect(17 + shift, 15, 2, 4);
  });
}
