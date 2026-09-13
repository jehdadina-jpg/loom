import { PAL } from "../palette";
import { getProceduralBitmap } from "../pixelArt";

export type IconName =
  | "home"
  | "market"
  | "veranda"
  | "waterpoint"
  | "field"
  | "community"
  | "garden"
  | "village"
  | "person"
  | "activity"
  | "rest"
  | "back"
  | "sun"
  | "moon"
  | "cycle";

const S = 16;

/** Small, purpose-drawn 16x16 icons used on destination plaques and guide prompts. */
export function iconSprite(name: IconName): HTMLCanvasElement {
  return getProceduralBitmap(`icon-${name}`, { w: S, h: S }, (ctx) => {
    const roof = (cx: number, y: number, halfW: number, color: string) => {
      ctx.fillStyle = color;
      for (let i = 0; i <= halfW; i++) {
        ctx.fillRect(cx - i, y + (halfW - i), i * 2 + 1, 1);
      }
    };

    switch (name) {
      case "home":
      case "village": {
        roof(8, 2, 6, name === "home" ? PAL.thatchMid : PAL.thatchBase);
        ctx.fillStyle = PAL.woodBase;
        ctx.fillRect(3, 8, 10, 6);
        ctx.fillStyle = PAL.doorMid;
        ctx.fillRect(7, 10, 3, 4);
        ctx.fillStyle = PAL.skyMid;
        ctx.fillRect(4, 9, 2, 2);
        ctx.fillStyle = PAL.woodShadow;
        ctx.fillRect(3, 13, 10, 1);
        break;
      }
      case "market": {
        // striped awning over a counter
        for (let x = 1; x < 15; x++) {
          ctx.fillStyle = Math.floor((x - 1) / 2) % 2 === 0 ? PAL.clothRed : PAL.clothCream;
          ctx.fillRect(x, 3, 1, 4);
        }
        ctx.fillStyle = PAL.woodDark;
        ctx.fillRect(1, 7, 14, 1);
        ctx.fillRect(2, 8, 2, 6);
        ctx.fillRect(12, 8, 2, 6);
        ctx.fillStyle = PAL.woodMid;
        ctx.fillRect(3, 10, 10, 3);
        ctx.fillStyle = PAL.fruitRed;
        ctx.fillRect(5, 8, 2, 2);
        ctx.fillStyle = PAL.cropYellow;
        ctx.fillRect(8, 8, 2, 2);
        break;
      }
      case "veranda": {
        ctx.fillStyle = PAL.woodMid;
        ctx.fillRect(1, 4, 14, 2);
        ctx.fillRect(1, 10, 14, 2);
        ctx.fillStyle = PAL.woodDark;
        ctx.fillRect(2, 3, 2, 11);
        ctx.fillRect(12, 3, 2, 11);
        ctx.fillStyle = PAL.woodBase;
        ctx.fillRect(6, 6, 1, 4);
        ctx.fillRect(9, 6, 1, 4);
        ctx.fillStyle = PAL.woodShadow;
        ctx.fillRect(1, 13, 14, 1);
        break;
      }
      case "waterpoint":
      case "rest": {
        ctx.fillStyle = PAL.waterBase;
        ctx.fillRect(2, 6, 12, 7);
        ctx.fillStyle = PAL.waterHi;
        ctx.fillRect(3, 7, 5, 1);
        ctx.fillRect(8, 9, 4, 1);
        ctx.fillRect(4, 11, 6, 1);
        ctx.fillStyle = PAL.waterDeep;
        ctx.fillRect(2, 12, 12, 1);
        ctx.fillStyle = PAL.leafBase;
        ctx.fillRect(2, 3, 1, 3);
        ctx.fillRect(4, 2, 1, 4);
        ctx.fillStyle = PAL.cropYellow;
        ctx.fillRect(4, 1, 1, 1);
        break;
      }
      case "field":
      case "garden": {
        ctx.fillStyle = PAL.soilBase;
        ctx.fillRect(1, 8, 14, 6);
        ctx.fillStyle = PAL.soilShadow;
        ctx.fillRect(1, 11, 14, 1);
        for (let i = 0; i < 4; i++) {
          const x = 2 + i * 3.5;
          ctx.fillStyle = PAL.leafBase;
          ctx.fillRect(x, 5, 2, 4);
          ctx.fillStyle = PAL.leafHi;
          ctx.fillRect(x, 4, 2, 1);
        }
        if (name === "garden") {
          ctx.fillStyle = PAL.fruitOrange;
          ctx.fillRect(5, 3, 2, 1);
          ctx.fillStyle = PAL.clothCream;
          ctx.fillRect(12, 3, 2, 1);
        }
        break;
      }
      case "community": {
        ctx.fillStyle = PAL.leafBase;
        ctx.beginPath();
        ctx.ellipse(8, 6, 6, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PAL.leafHi;
        ctx.beginPath();
        ctx.ellipse(6, 5, 3, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PAL.trunkBase;
        ctx.fillRect(7, 10, 2, 4);
        ctx.fillStyle = PAL.woodMid;
        ctx.fillRect(2, 12, 4, 1);
        ctx.fillRect(10, 12, 4, 1);
        break;
      }
      case "person": {
        ctx.fillStyle = PAL.hairBlack;
        ctx.beginPath();
        ctx.ellipse(8, 5, 3.4, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PAL.skin2;
        ctx.beginPath();
        ctx.ellipse(8, 6, 2.6, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PAL.ink;
        ctx.fillRect(7, 6, 1, 1);
        ctx.fillRect(9, 6, 1, 1);
        ctx.fillStyle = PAL.clothTeal;
        for (let y = 9; y < 14; y++) {
          const w = 5 + (y - 9);
          ctx.fillRect(8 - w / 2, y, w, 1);
        }
        break;
      }
      case "activity": {
        ctx.fillStyle = PAL.woodMid;
        ctx.fillRect(2, 3, 12, 11);
        ctx.fillStyle = PAL.frameCream;
        ctx.fillRect(3, 4, 10, 9);
        ctx.fillStyle = PAL.woodDark;
        ctx.fillRect(5, 6, 6, 1);
        ctx.fillRect(5, 8, 6, 1);
        ctx.fillRect(5, 10, 4, 1);
        ctx.fillStyle = PAL.clothMustard;
        ctx.fillRect(10, 1, 3, 3);
        break;
      }
      case "sun": {
        ctx.fillStyle = "#ffd66b";
        ctx.beginPath();
        ctx.arc(8, 8, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff0b8";
        ctx.beginPath();
        ctx.arc(6.6, 6.6, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffc34d";
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.fillRect(Math.round(8 + Math.cos(a) * 6.4), Math.round(8 + Math.sin(a) * 6.4), 2, 2);
        }
        break;
      }
      case "moon": {
        ctx.fillStyle = "#e8ecff";
        ctx.beginPath();
        ctx.arc(8, 8, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1b2350";
        ctx.beginPath();
        ctx.arc(11, 6, 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillRect(2, 3, 1, 1);
        ctx.fillRect(13, 12, 1, 1);
        ctx.fillRect(4, 13, 1, 1);
        break;
      }
      case "cycle": {
        ctx.fillStyle = "#ffd66b";
        ctx.beginPath();
        ctx.arc(8, 9, 4.4, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5b7fc7";
        ctx.fillRect(1, 9, 14, 2);
        ctx.fillStyle = "#e8ecff";
        ctx.fillRect(11, 4, 2, 2);
        ctx.fillRect(3, 3, 1, 1);
        break;
      }
      case "back": {
        ctx.fillStyle = PAL.frameCream;
        for (let i = 0; i < 5; i++) ctx.fillRect(3 + i, 8 - i, 1, 1 + i * 2);
        ctx.fillRect(7, 7, 6, 3);
        break;
      }
    }
  });
}

export function iconForLocation(id: string): IconName {
  switch (id) {
    case "home":
      return "home";
    case "market":
      return "market";
    case "veranda":
      return "veranda";
    case "waterpoint":
      return "waterpoint";
    case "field":
      return "field";
    case "community":
      return "community";
    case "garden":
      return "garden";
    default:
      return "village";
  }
}
