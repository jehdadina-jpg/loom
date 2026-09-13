import { PAL } from "../palette";
import { getProceduralBitmap } from "../pixelArt";
import { paintOrganicBlobs } from "./organic";

export function fruitSprite(kind: "red" | "orange" | "yellow" | "green"): HTMLCanvasElement {
  const tones = {
    red: { shadow: "#7c2828", dark: "#a83b3b", base: "#c14b41", mid: "#d9695c", hi: "#f0968a" },
    orange: { shadow: "#9c5a1e", dark: "#c1732a", base: "#dd8b3a", mid: "#eaa858", hi: "#f6c789" },
    yellow: { shadow: "#9c7526", dark: "#c99a3a", base: "#d9b23e", mid: "#e8c860", hi: "#f5df90" },
    green: { shadow: "#1b4022", dark: "#296b32", base: "#4d9150", mid: "#6bab5f", hi: "#93cf7e" },
  }[kind];
  return getProceduralBitmap(`fruit-${kind}`, { w: 12, h: 12 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.ellipse(6, 11, 4, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    paintOrganicBlobs(ctx, 0, 0, [{ dx: 6, dy: 6, rx: 5, ry: 4.6 }], tones, { seed: 1 });
    ctx.fillStyle = PAL.leafBase;
    ctx.fillRect(6, 1, 2, 2);
  });
}

export function basketSprite(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`basket-${variant}`, { w: 12, h: 10 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(6, 9, 5, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.basketBase;
    ctx.beginPath();
    ctx.moveTo(1, 4);
    ctx.lineTo(11, 4);
    ctx.lineTo(10, 9);
    ctx.lineTo(2, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.basketDark;
    for (let y = 4; y < 9; y += 2) ctx.fillRect(1, y, 10, 1);
    ctx.fillStyle = PAL.basketDark;
    ctx.fillRect(1, 3, 10, 1);
    const colors = [PAL.fruitRed, PAL.fruitOrange, PAL.cropYellow, PAL.leafBase];
    const c = colors[variant % colors.length];
    ctx.fillStyle = c;
    ctx.fillRect(2, 0, 3, 4);
    ctx.fillRect(5, 1, 3, 3);
    ctx.fillRect(8, 0, 3, 4);
  });
}

export function potSprite(variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`pot-${variant}`, { w: 10, h: 10 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(5, 9, 4, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.dirtDark;
    ctx.beginPath();
    ctx.ellipse(5, 5, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.dirtBase;
    ctx.beginPath();
    ctx.ellipse(4, 4, 2.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.dirtShadow;
    ctx.fillRect(2, 1, 6, 1);
  });
}

export function crateSprite(): HTMLCanvasElement {
  return getProceduralBitmap("crate", { w: 12, h: 11 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.2;
    ctx.fillRect(1, 10, 10, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.woodMid;
    ctx.fillRect(1, 1, 10, 9);
    ctx.fillStyle = PAL.woodShadow;
    ctx.strokeRect(1.5, 1.5, 9, 8);
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(11, 10);
    ctx.moveTo(11, 1);
    ctx.lineTo(1, 10);
    ctx.stroke();
    ctx.fillStyle = PAL.woodHi;
    ctx.fillRect(1, 1, 10, 1);
  });
}

export function benchSprite(): HTMLCanvasElement {
  return getProceduralBitmap("bench", { w: 26, h: 12 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.2;
    ctx.fillRect(2, 11, 22, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.woodBase;
    ctx.fillRect(0, 2, 26, 3);
    ctx.fillStyle = PAL.woodHi;
    ctx.fillRect(0, 2, 26, 1);
    ctx.fillStyle = PAL.woodShadow;
    ctx.fillRect(2, 5, 2, 6);
    ctx.fillRect(22, 5, 2, 6);
  });
}

export function firewoodSprite(): HTMLCanvasElement {
  return getProceduralBitmap("firewood", { w: 16, h: 8 }, (ctx) => {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? PAL.woodDark : PAL.woodBase;
      ctx.fillRect(i * 4, 2, 3, 6);
      ctx.fillStyle = PAL.dirtHi;
      ctx.beginPath();
      ctx.ellipse(i * 4 + 1.5, 2, 1.5, 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function cropRowSprite(stage: 0 | 1 | 2, variant: number): HTMLCanvasElement {
  return getProceduralBitmap(`crop-${stage}-${variant}`, { w: 16, h: 12 }, (ctx) => {
    ctx.fillStyle = PAL.dirtBase;
    ctx.fillRect(0, 8, 16, 4);
    ctx.fillStyle = PAL.dirtDark;
    ctx.fillRect(0, 8, 16, 1);
    const plantCount = 4;
    for (let i = 0; i < plantCount; i++) {
      const px = 1 + i * 3.6;
      const h = stage === 0 ? 2 : stage === 1 ? 5 : 8;
      for (let y = 0; y < h; y++) {
        ctx.fillStyle = y > h - 2 ? PAL.leafHi : PAL.leafBase;
        ctx.fillRect(px, 8 - y, 2, 1);
      }
      if (stage === 2) {
        ctx.fillStyle = variant % 2 === 0 ? PAL.cropYellow : PAL.fruitOrange;
        ctx.fillRect(px, 8 - h, 2, 1);
      }
    }
  });
}

export function stoolSprite(): HTMLCanvasElement {
  return getProceduralBitmap("stool", { w: 10, h: 8 }, (ctx) => {
    ctx.fillStyle = PAL.woodMid;
    ctx.fillRect(0, 0, 10, 2);
    ctx.fillStyle = PAL.woodHi;
    ctx.fillRect(0, 0, 10, 1);
    ctx.fillStyle = PAL.woodShadow;
    ctx.fillRect(1, 2, 1, 5);
    ctx.fillRect(8, 2, 1, 5);
  });
}

/** A numbered wooden counting card, used by the "how many?" activities. */
export function numberCard(n: number): HTMLCanvasElement {
  const DIGITS: Record<string, string[]> = {
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"],
    "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"],
    "9": ["111", "101", "111", "001", "111"],
  };
  return getProceduralBitmap(`number-${n}`, { w: 14, h: 16 }, (ctx) => {
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(0, 0, 14, 16);
    ctx.fillStyle = PAL.frameCream;
    ctx.fillRect(1, 1, 12, 14);
    ctx.fillStyle = PAL.woodMid;
    ctx.fillRect(1, 1, 12, 1);
    const glyph = DIGITS[String(n)] ?? DIGITS["1"];
    ctx.fillStyle = PAL.doorShadow;
    for (let gy = 0; gy < glyph.length; gy++) {
      for (let gx = 0; gx < glyph[gy].length; gx++) {
        if (glyph[gy][gx] === "1") ctx.fillRect(4 + gx * 2, 3 + gy * 2, 2, 2);
      }
    }
  });
}

/** A square of woven cloth — the colours villagers actually wear. */
export function clothSwatch(color: "red" | "teal" | "indigo" | "mustard" | "cream"): HTMLCanvasElement {
  const base = {
    red: PAL.clothRed,
    teal: PAL.clothTeal,
    indigo: PAL.clothIndigo,
    mustard: PAL.clothMustard,
    cream: PAL.clothCream,
  }[color];
  const shade = {
    red: PAL.clothRedSh,
    teal: PAL.clothTealSh,
    indigo: PAL.clothIndigoSh,
    mustard: PAL.clothMustardSh,
    cream: PAL.clothCreamSh,
  }[color];
  return getProceduralBitmap(`cloth-${color}`, { w: 14, h: 12 }, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 14, 12);
    ctx.fillStyle = shade;
    for (let y = 1; y < 12; y += 3) ctx.fillRect(0, y, 14, 1);
    for (let x = 2; x < 14; x += 4) ctx.fillRect(x, 0, 1, 12);
    ctx.fillStyle = PAL.frameCream;
    ctx.fillRect(0, 0, 14, 1);
    ctx.fillStyle = PAL.woodShadow;
    ctx.fillRect(0, 11, 14, 1);
  });
}

export function riceBowlSprite(): HTMLCanvasElement {
  return getProceduralBitmap("ricebowl", { w: 14, h: 10 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.2;
    ctx.fillRect(2, 9, 10, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.frameCream;
    ctx.beginPath();
    ctx.ellipse(7, 4, 6, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.clothTeal;
    ctx.beginPath();
    ctx.moveTo(1, 4);
    ctx.lineTo(13, 4);
    ctx.lineTo(11, 9);
    ctx.lineTo(3, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.clothTealSh;
    ctx.fillRect(3, 8, 8, 1);
  });
}

export function fishSprite(): HTMLCanvasElement {
  return getProceduralBitmap("fish", { w: 16, h: 10 }, (ctx) => {
    ctx.fillStyle = PAL.stoneMid;
    ctx.beginPath();
    ctx.ellipse(8, 5, 5.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.stoneHi;
    ctx.beginPath();
    ctx.ellipse(7, 4, 3, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.stoneMid;
    ctx.beginPath();
    ctx.moveTo(14, 5);
    ctx.lineTo(16, 2);
    ctx.lineTo(16, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(4, 4, 1, 1);
  });
}

export function lampSprite(): HTMLCanvasElement {
  return getProceduralBitmap("lamp", { w: 12, h: 16 }, (ctx) => {
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(4, 0, 4, 2);
    ctx.fillRect(5, 2, 2, 2);
    ctx.fillStyle = PAL.stoneDark;
    ctx.fillRect(2, 4, 8, 9);
    ctx.fillStyle = "#ffd08a";
    ctx.fillRect(3, 5, 6, 7);
    ctx.fillStyle = "#ff9d46";
    ctx.fillRect(5, 7, 2, 4);
    ctx.fillStyle = PAL.woodShadow;
    ctx.fillRect(2, 13, 8, 3);
  });
}

export function broomSprite(): HTMLCanvasElement {
  return getProceduralBitmap("broom", { w: 10, h: 16 }, (ctx) => {
    ctx.fillStyle = PAL.woodBase;
    ctx.fillRect(4, 0, 2, 10);
    ctx.fillStyle = PAL.cropYellow;
    for (let i = 0; i < 6; i++) ctx.fillRect(2 + i, 10, 1, 5 + ((i % 2) ? 1 : 0));
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(2, 9, 6, 1);
  });
}

export function kettleSprite(): HTMLCanvasElement {
  return getProceduralBitmap("kettle", { w: 16, h: 14 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(8, 13, 5, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.stoneShadow;
    ctx.beginPath();
    ctx.ellipse(8, 8, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.stoneMid;
    ctx.beginPath();
    ctx.ellipse(6.5, 6.5, 3.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(6, 1, 4, 2);
    ctx.beginPath();
    ctx.moveTo(13, 6);
    ctx.lineTo(16, 4);
    ctx.lineTo(15, 6);
    ctx.lineTo(13, 8);
    ctx.closePath();
    ctx.fillStyle = PAL.stoneShadow;
    ctx.fill();
  });
}

export function cupSprite(): HTMLCanvasElement {
  return getProceduralBitmap("cup", { w: 10, h: 8 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.2;
    ctx.fillRect(1, 7, 8, 1);
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.clothCream;
    ctx.fillRect(1, 2, 7, 5);
    ctx.fillStyle = PAL.dirtMid;
    ctx.fillRect(1, 2, 7, 2);
    ctx.strokeStyle = PAL.woodDark;
    ctx.beginPath();
    ctx.moveTo(8, 3);
    ctx.quadraticCurveTo(11, 4, 8, 6);
    ctx.stroke();
  });
}

export function leafBundleSprite(): HTMLCanvasElement {
  return getProceduralBitmap("leafbundle", { w: 12, h: 10 }, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.ellipse(6, 9, 5, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? PAL.leafBase : PAL.leafMid;
      ctx.beginPath();
      ctx.ellipse(3 + i * 2, 6 - (i % 2), 2.4, 3.4, -0.3 + i * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PAL.leafShadow;
    ctx.fillRect(5, 7, 2, 3);
  });
}

export function toolSprite(kind: "hoe" | "bucket"): HTMLCanvasElement {
  return getProceduralBitmap(`tool-${kind}`, { w: 10, h: 16 }, (ctx) => {
    if (kind === "hoe") {
      ctx.fillStyle = PAL.woodBase;
      ctx.fillRect(4, 0, 1, 13);
      ctx.fillStyle = PAL.stoneMid;
      ctx.fillRect(1, 12, 6, 2);
      ctx.fillStyle = PAL.stoneShadow;
      ctx.fillRect(1, 13, 6, 1);
    } else {
      ctx.fillStyle = PAL.stoneMid;
      ctx.fillRect(1, 6, 8, 8);
      ctx.fillStyle = PAL.stoneShadow;
      ctx.fillRect(1, 6, 8, 1);
      ctx.fillStyle = PAL.waterBase;
      ctx.fillRect(2, 8, 6, 5);
      ctx.strokeStyle = PAL.woodDark;
      ctx.beginPath();
      ctx.moveTo(1, 6);
      ctx.quadraticCurveTo(5, 0, 9, 6);
      ctx.stroke();
    }
  });
}
