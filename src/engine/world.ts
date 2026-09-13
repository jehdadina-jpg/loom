import { drawCastShadow } from "./fx/Lighting";
import type { SkyState } from "./fx/DayNight";

export interface WorldObject {
  x: number;
  y: number;
  /** sort key for painter's-algorithm depth ordering; usually the object's ground contact y */
  z: number;
  bitmap: (time: number) => HTMLCanvasElement;
  anchor?: "bottom" | "center" | "top-left";
  alpha?: number;
  /** Overrides x/y each frame — used by anything that moves, like walking villagers. */
  pos?: (time: number) => { x: number; y: number };
  /** Draw a sun-driven cast shadow beneath this object. */
  castsShadow?: boolean;
  /** Mirror this object into water below it. */
  reflects?: boolean;
}

export function worldObj(
  x: number,
  y: number,
  bitmap: (time: number) => HTMLCanvasElement,
  opts?: {
    z?: number;
    anchor?: WorldObject["anchor"];
    alpha?: number;
    pos?: WorldObject["pos"];
    castsShadow?: boolean;
    reflects?: boolean;
  },
): WorldObject {
  return {
    x,
    y,
    z: opts?.z ?? y,
    bitmap,
    anchor: opts?.anchor ?? "bottom",
    alpha: opts?.alpha,
    pos: opts?.pos,
    castsShadow: opts?.castsShadow ?? true,
    reflects: opts?.reflects,
  };
}

export function renderWorldObjects(
  ctx: CanvasRenderingContext2D,
  objects: WorldObject[],
  time: number,
  sky?: SkyState,
) {
  const resolved = objects.map((o) => {
    const p = o.pos?.(time);
    return p ? { o, x: p.x, y: p.y, z: p.y } : { o, x: o.x, y: o.y, z: o.z };
  });
  resolved.sort((a, b) => a.z - b.z);

  for (const { o, x, y } of resolved) {
    const bmp = o.bitmap(time);

    if (sky && o.castsShadow !== false && o.anchor !== "top-left") {
      drawCastShadow(ctx, x, y - 1, bmp.width, bmp.height, sky);
    }

    let dx = x;
    let dy = y;
    if (o.anchor === "bottom") {
      dx = Math.round(x - bmp.width / 2);
      dy = Math.round(y - bmp.height);
    } else if (o.anchor === "center") {
      dx = Math.round(x - bmp.width / 2);
      dy = Math.round(y - bmp.height / 2);
    } else {
      dx = Math.round(x);
      dy = Math.round(y);
    }

    if (o.alpha !== undefined) {
      ctx.globalAlpha = o.alpha;
      ctx.drawImage(bmp, dx, dy);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(bmp, dx, dy);
    }
  }
}

/** Pick an animation frame (0/1) from wall-clock time, per-entity phase-shifted so a crowd doesn't sync. */
export function idleFrame(time: number, periodMs: number, phase = 0): 0 | 1 {
  return Math.floor(time / periodMs + phase) % 2 === 0 ? 0 : 1;
}

export interface Waypoint {
  x: number;
  y: number;
  /** Seconds to stand still here before moving on. */
  pause?: number;
}

/**
 * Walks a looping route through waypoints, returning position and facing for a given time.
 * Deterministic from `time` alone, so it needs no per-frame state and survives re-renders.
 */
export function walkRoute(waypoints: Waypoint[], speed: number, time: number) {
  if (waypoints.length < 2) {
    const w = waypoints[0] ?? { x: 0, y: 0 };
    return { x: w.x, y: w.y, moving: false, facing: 1 as 1 | -1 };
  }

  const legs = waypoints.map((wp, i) => {
    const next = waypoints[(i + 1) % waypoints.length];
    const dist = Math.hypot(next.x - wp.x, next.y - wp.y);
    return { from: wp, to: next, dist, travel: dist / speed, pause: wp.pause ?? 0 };
  });

  const total = legs.reduce((s, l) => s + l.travel + l.pause, 0);
  let t = (time / 1000) % total;

  for (const leg of legs) {
    if (t < leg.pause) {
      return { x: leg.from.x, y: leg.from.y, moving: false, facing: (leg.to.x >= leg.from.x ? 1 : -1) as 1 | -1 };
    }
    t -= leg.pause;
    if (t < leg.travel) {
      const k = leg.travel === 0 ? 0 : t / leg.travel;
      return {
        x: leg.from.x + (leg.to.x - leg.from.x) * k,
        y: leg.from.y + (leg.to.y - leg.from.y) * k,
        moving: true,
        facing: (leg.to.x >= leg.from.x ? 1 : -1) as 1 | -1,
      };
    }
    t -= leg.travel;
  }

  const last = waypoints[0];
  return { x: last.x, y: last.y, moving: false, facing: 1 as 1 | -1 };
}
