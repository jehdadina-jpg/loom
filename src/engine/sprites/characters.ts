import { PAL } from "../palette";
import { getProceduralBitmap } from "../pixelArt";

export type BodyShape = "adult" | "elder" | "youth";
export type HairStyle = "short" | "bun" | "long" | "thin" | "cap";

export interface VillagerPalette {
  skin: string;
  skinSh: string;
  skinHi: string;
  hair: string;
  hairHi: string;
  cloth: string;
  clothSh: string;
  clothHi: string;
  accent: string;
  trousers: string;
}

export const VILLAGER_PALETTES: Record<string, VillagerPalette> = {
  ramal: {
    skin: PAL.skin3,
    skinSh: PAL.skin3Sh,
    skinHi: PAL.skin2,
    hair: PAL.hairGrey,
    hairHi: PAL.hairGreyHi,
    cloth: PAL.clothMaroon,
    clothSh: PAL.clothMaroonSh,
    clothHi: PAL.clothCream,
    accent: PAL.clothMustard,
    trousers: PAL.woodDark,
  },
  bimal: {
    skin: PAL.skin2,
    skinSh: PAL.skin2Sh,
    skinHi: PAL.skin1,
    hair: PAL.hairBlack,
    hairHi: PAL.hairBlackHi,
    cloth: PAL.clothBlue,
    clothSh: PAL.clothBlueSh,
    clothHi: PAL.clothCream,
    accent: PAL.clothMustard,
    trousers: PAL.dirtShadow,
  },
  deeplia: {
    skin: PAL.skin2,
    skinSh: PAL.skin2Sh,
    skinHi: PAL.skin1,
    hair: PAL.hairBlack,
    hairHi: PAL.hairBlackHi,
    cloth: PAL.clothRed,
    clothSh: PAL.clothRedSh,
    clothHi: PAL.clothCream,
    accent: PAL.clothIndigo,
    trousers: PAL.clothIndigoSh,
  },
  rumak: {
    skin: PAL.skin1,
    skinSh: PAL.skin1Sh,
    skinHi: PAL.skin1,
    hair: PAL.hairBrown,
    hairHi: PAL.hairBrownHi,
    cloth: PAL.clothTeal,
    clothSh: PAL.clothTealSh,
    clothHi: PAL.clothCream,
    accent: PAL.clothCream,
    trousers: PAL.clothIndigoSh,
  },
  naren: {
    skin: PAL.skin1,
    skinSh: PAL.skin1Sh,
    skinHi: PAL.skin1,
    hair: PAL.hairBlack,
    hairHi: PAL.hairBlackHi,
    cloth: PAL.clothMustard,
    clothSh: PAL.clothMustardSh,
    clothHi: PAL.clothCream,
    accent: PAL.clothTeal,
    trousers: PAL.dirtShadow,
  },
  vendor: {
    skin: PAL.skin3,
    skinSh: PAL.skin3Sh,
    skinHi: PAL.skin2,
    hair: PAL.hairBlack,
    hairHi: PAL.hairBlackHi,
    cloth: PAL.clothIndigo,
    clothSh: PAL.clothIndigoSh,
    clothHi: PAL.clothCream,
    accent: PAL.fruitOrange,
    trousers: PAL.woodDark,
  },
};

function rowSpan(y: number, yTop: number, yBottom: number, wTop: number, wBottom: number) {
  const t = (y - yTop) / Math.max(1, yBottom - yTop);
  return wTop + (wBottom - wTop) * t;
}

export interface VillagerOptions {
  id: string;
  shape: BodyShape;
  hairStyle: HairStyle;
  frame: 0 | 1;
  pal: VillagerPalette;
  /** "walk" splits the legs and swings the arms; "idle" is the standing breath cycle. */
  pose?: "idle" | "walk";
  /** -1 mirrors the sprite so a villager can face the way they're travelling. */
  facing?: 1 | -1;
}

/** A full readable villager sprite — head, hair, torso, arms, legs, shoes — with a gentle idle-breath frame. */
export function villagerSprite(opts: VillagerOptions): HTMLCanvasElement {
  const pose = opts.pose ?? "idle";
  const facing = opts.facing ?? 1;
  const key = `villager-${opts.id}-${opts.shape}-${opts.hairStyle}-${opts.frame}-${pose}-${facing}`;
  const W = 22,
    H = 34;
  return getProceduralBitmap(key, { w: W, h: H }, (ctx) => {
    if (facing === -1) {
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
    }
    const p = opts.pal;
    const cx = 11;
    const bob = opts.frame === 1 ? 1 : 0;
    const isElder = opts.shape === "elder";
    const isYouth = opts.shape === "youth";
    const scale = isYouth ? 0.86 : 1;
    const hunch = isElder ? 1 : 0;

    const headCy = 8 + bob + hunch;
    const headR = 4.6 * scale;
    const neckY = headCy + headR - 1;
    const shoulderY = neckY + 2;
    const hipY = shoulderY + 11 * scale;
    const legTopY = hipY;
    const legBotY = legTopY + 8 * scale;
    const footY = legBotY + 2;

    // ground shadow
    ctx.fillStyle = "#000000";
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.ellipse(cx, footY + 1, 6 * scale, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // legs (trousers) — a stride offset opens them up while walking
    const stride = pose === "walk" ? (opts.frame === 0 ? 2 : -2) : 0;
    for (let y = legTopY; y < legBotY; y++) {
      const w = rowSpan(y, legTopY, legBotY, 6.5 * scale, 5.5 * scale);
      const gap = 1.2;
      const t = (y - legTopY) / Math.max(1, legBotY - legTopY);
      const swing = stride * t;
      const leftA = Math.round(cx - w / 2 - swing);
      const leftB = Math.round(cx - gap - swing);
      const rightA = Math.round(cx + gap + swing);
      const rightB = Math.round(cx + w / 2 + swing);
      ctx.fillStyle = p.trousers;
      ctx.fillRect(leftA, y, Math.max(1, leftB - leftA), 1);
      ctx.fillRect(rightA, y, Math.max(1, rightB - rightA), 1);
      ctx.fillStyle = "#00000022";
      ctx.fillRect(rightB - 1, y, 1, 1);
    }
    // shoes follow the stride
    ctx.fillStyle = PAL.woodShadow;
    ctx.fillRect(cx - 5 * scale - stride, footY - (pose === "walk" ? Math.abs(stride) * 0.3 : 0), 3.5 * scale, 2);
    ctx.fillRect(cx + 1.5 * scale + stride, footY, 3.5 * scale, 2);

    // torso (tunic) — tapered trapezoid, shoulders wide, waist narrower
    const torsoTopW = 11 * scale;
    const torsoBotW = 8.5 * scale;
    for (let y = shoulderY; y < hipY; y++) {
      const w = rowSpan(y, shoulderY, hipY, torsoTopW, torsoBotW);
      const left = Math.round(cx - w / 2);
      const right = Math.round(cx + w / 2);
      for (let x = left; x <= right; x++) {
        const rel = (x - left) / Math.max(1, right - left);
        ctx.fillStyle = rel < 0.22 ? p.clothHi : rel > 0.82 ? p.clothSh : p.cloth;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // chest accent sash
    ctx.fillStyle = p.accent;
    const sashY = shoulderY + Math.round(3 * scale);
    ctx.fillRect(cx - torsoTopW / 2 + 1, sashY, torsoTopW - 2, 2);

    // arms (sleeves) at the sides — a bigger swing while walking
    const armSwing = pose === "walk" ? (opts.frame === 1 ? -2 : 2) : opts.frame === 1 ? 0 : 1;
    for (const side of [-1, 1]) {
      const armX = cx + side * (torsoTopW / 2 + 0.5);
      for (let y = shoulderY + 1; y < shoulderY + 8 * scale; y++) {
        const dx = side * armSwing * (y > shoulderY + 5 ? 1 : 0);
        ctx.fillStyle = y > shoulderY + 6 * scale ? p.skin : p.cloth;
        ctx.fillRect(Math.round(armX + dx), y, 2, 1);
      }
    }

    // neck
    ctx.fillStyle = p.skinSh;
    ctx.fillRect(cx - 1.5, neckY - 1, 3, 2);

    // head
    for (let y = -headR; y <= headR; y++) {
      const rowW = Math.sqrt(Math.max(0, headR * headR - y * y));
      const left = Math.round(cx - rowW);
      const right = Math.round(cx + rowW);
      for (let x = left; x <= right; x++) {
        const nx = (x - cx) / headR;
        const ny = y / headR;
        const dot = -nx * 0.7 - ny * 0.7;
        ctx.fillStyle = dot > 0.35 ? p.skinHi : dot < -0.45 ? p.skinSh : p.skin;
        ctx.fillRect(x, Math.round(headCy + y), 1, 1);
      }
    }

    // face: eyes + soft mouth line (simple, calm, legible at small size)
    const eyeY = Math.round(headCy + 0.5);
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(Math.round(cx - headR * 0.45), eyeY, 1, 1);
    ctx.fillRect(Math.round(cx + headR * 0.45), eyeY, 1, 1);
    ctx.fillStyle = p.skinSh;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(Math.round(cx - 1), Math.round(headCy + headR * 0.55), 2, 1);
    ctx.globalAlpha = 1;

    // hair
    ctx.fillStyle = p.hair;
    const hr = headR + 0.8;
    if (opts.hairStyle === "short" || opts.hairStyle === "cap") {
      for (let y = -hr; y < -0.2; y++) {
        const rowW = Math.sqrt(Math.max(0, hr * hr - y * y));
        ctx.fillRect(Math.round(cx - rowW), Math.round(headCy + y), Math.round(rowW * 2), 1);
      }
      ctx.fillStyle = p.hairHi;
      ctx.fillRect(Math.round(cx - hr + 1), Math.round(headCy - hr + 1), 2, 1);
    } else if (opts.hairStyle === "thin") {
      for (let y = -hr; y < -hr * 0.4; y++) {
        const rowW = Math.sqrt(Math.max(0, hr * hr - y * y));
        ctx.fillRect(Math.round(cx - rowW), Math.round(headCy + y), Math.round(rowW * 2), 1);
      }
    } else if (opts.hairStyle === "bun") {
      for (let y = -hr; y < 0.3; y++) {
        const rowW = Math.sqrt(Math.max(0, hr * hr - y * y));
        ctx.fillRect(Math.round(cx - rowW), Math.round(headCy + y), Math.round(rowW * 2), 1);
      }
      ctx.fillStyle = p.hair;
      ctx.beginPath();
      ctx.ellipse(cx, headCy - hr - 1, 2, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (opts.hairStyle === "long") {
      for (let y = -hr; y < 0.5; y++) {
        const rowW = Math.sqrt(Math.max(0, hr * hr - y * y));
        ctx.fillRect(Math.round(cx - rowW), Math.round(headCy + y), Math.round(rowW * 2), 1);
      }
      ctx.fillStyle = p.hair;
      ctx.fillRect(Math.round(cx - hr), Math.round(headCy), Math.round(hr * 0.6), 6 * scale);
      ctx.fillRect(Math.round(cx + hr * 0.4), Math.round(headCy), Math.round(hr * 0.6), 6 * scale);
    }

    if (isElder) {
      // simple walking cane for the elder shape, held on the right side
      ctx.fillStyle = PAL.woodBase;
      ctx.fillRect(Math.round(cx + torsoTopW / 2 + 1), Math.round(shoulderY + 4), 1, Math.round(legBotY - shoulderY - 2));
    }
  });
}
