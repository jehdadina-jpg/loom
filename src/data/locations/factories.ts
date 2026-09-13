import { idleFrame, walkRoute, worldObj, type Waypoint, type WorldObject } from "../../engine/world";
import { outlined } from "../../engine/pixelArt";
import {
  treeSprite,
  bushSprite,
  rockSprite,
  flowerClumpSprite,
  tallGrassTuftSprite,
  reedSprite,
  bigTreeSprite,
  pineSprite,
} from "../../engine/sprites/nature";
import {
  houseSprite,
  fenceSegmentSprite,
  marketStallSprite,
  verandaRailSprite,
  waterPlatformSprite,
  wellSprite,
  signpostSprite,
  type HouseOptions,
} from "../../engine/sprites/structures";
import {
  basketSprite,
  potSprite,
  crateSprite,
  benchSprite,
  firewoodSprite,
  cropRowSprite,
  stoolSprite,
  toolSprite,
  kettleSprite,
  barrelSprite,
  hayBaleSprite,
  ladderSprite,
  lanternPostSprite,
  wagonSprite,
} from "../../engine/sprites/props";
import { villagerSprite, VILLAGER_PALETTES, type BodyShape, type HairStyle } from "../../engine/sprites/characters";
import { chickenSprite, dogSprite, goatSprite } from "../../engine/sprites/animals";
import { getNPC } from "../npcs";
import type { TileGrid, TileKind } from "../../engine/tilemap";

export function filledGrid(cols: number, rows: number, kind: TileKind): TileGrid {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => kind));
}

export function paintRegion(
  grid: TileGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  opts: { fill: TileKind; top?: TileKind; bottom?: TileKind; left?: TileKind; right?: TileKind },
) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (y < 0 || x < 0 || y >= grid.length || x >= grid[0].length) continue;
      let kind = opts.fill;
      if (y === y0 && opts.top) kind = opts.top;
      else if (y === y1 && opts.bottom) kind = opts.bottom;
      else if (x === x0 && opts.left) kind = opts.left;
      else if (x === x1 && opts.right) kind = opts.right;
      grid[y][x] = kind;
    }
  }
}

export function pathRegion(grid: TileGrid, x0: number, y0: number, x1: number, y1: number) {
  paintRegion(grid, x0, y0, x1, y1, {
    fill: "path",
    top: "pathEdgeTop",
    bottom: "pathEdgeBottom",
    left: "pathEdgeLeft",
    right: "pathEdgeRight",
  });
}

export function waterRegion(grid: TileGrid, x0: number, y0: number, x1: number, y1: number) {
  paintRegion(grid, x0, y0, x1, y1, {
    fill: "water",
    top: "waterEdgeTop",
    bottom: "waterEdgeBottom",
    left: "waterEdgeLeft",
    right: "waterEdgeRight",
  });
}

/** Marks an object as distant so it draws smaller — used to make a street recede. */
export function far(obj: WorldObject, scale = 0.72): WorldObject {
  return { ...obj, scale };
}

// ---- entity factories ---------------------------------------------------
// Every entity goes through `outlined()` so it carries a dark rim and reads
// clearly against the terrain no matter what it's standing on.

export function treeObj(x: number, y: number, variant: number, kind: "round" | "tall" = "round"): WorldObject {
  return worldObj(x, y, outlined(() => treeSprite(variant, kind)));
}
export function bigTreeObj(x: number, y: number, variant: number): WorldObject {
  return worldObj(x, y, outlined(() => bigTreeSprite(variant)));
}
export function pineObj(x: number, y: number, variant: number): WorldObject {
  return worldObj(x, y, outlined(() => pineSprite(variant)));
}
export function barrelObj(x: number, y: number): WorldObject {
  return worldObj(x, y, outlined(() => barrelSprite()));
}
export function hayObj(x: number, y: number): WorldObject {
  return worldObj(x, y, outlined(() => hayBaleSprite()));
}
export function ladderObj(x: number, y: number): WorldObject {
  return worldObj(x, y, outlined(() => ladderSprite()));
}
export function lanternPostObj(x: number, y: number): WorldObject {
  return worldObj(x, y, outlined(() => lanternPostSprite()));
}
export function wagonObj(x: number, y: number): WorldObject {
  return worldObj(x, y, outlined(() => wagonSprite()));
}
export function bushObj(x: number, y: number, variant: number): WorldObject {
  return worldObj(x, y, outlined(() => bushSprite(variant)));
}
export function rockObj(x: number, y: number, variant: number): WorldObject {
  return worldObj(x, y, outlined(() => rockSprite(variant)));
}
export function flowerObj(x: number, y: number, variant: number): WorldObject {
  return worldObj(x, y, outlined(() => flowerClumpSprite(variant)));
}
export function grassTuftObj(x: number, y: number, variant: number): WorldObject {
  return worldObj(x, y, outlined(() => tallGrassTuftSprite(variant)));
}
export function reedObj(x: number, y: number, variant: number): WorldObject {
  return worldObj(x, y, outlined(() => reedSprite(variant)));
}
export function houseObj(x: number, y: number, opts: HouseOptions): WorldObject {
  return worldObj(x, y, outlined(() => houseSprite(opts)));
}
export function fenceObj(x: number, y: number, variant: number): WorldObject {
  return worldObj(x, y, outlined(() => fenceSegmentSprite(variant)));
}
export function stallObj(x: number, y: number, variant: number, accent: string): WorldObject {
  return worldObj(x, y, outlined((t) => marketStallSprite(variant, accent, idleFrame(t, 700, variant))));
}
export function verandaRailObj(x: number, y: number, variant: number): WorldObject {
  return worldObj(x, y, outlined(() => verandaRailSprite(variant)));
}
export function waterPlatformObj(x: number, y: number): WorldObject {
  return worldObj(x, y, outlined(() => waterPlatformSprite()));
}
export function wellObj(x: number, y: number): WorldObject {
  return worldObj(x, y, outlined(() => wellSprite()));
}
export function signpostObj(x: number, y: number, direction: "left" | "right" | "none" = "none"): WorldObject {
  return worldObj(x, y, outlined(() => signpostSprite(direction)));
}
export function basketObj(x: number, y: number, variant: number): WorldObject {
  return worldObj(x, y, outlined(() => basketSprite(variant)));
}
export function potObj(x: number, y: number, variant: number): WorldObject {
  return worldObj(x, y, outlined(() => potSprite(variant)));
}
export function crateObj(x: number, y: number): WorldObject {
  return worldObj(x, y, outlined(() => crateSprite()));
}
export function benchObj(x: number, y: number): WorldObject {
  return worldObj(x, y, outlined(() => benchSprite()));
}
export function firewoodObj(x: number, y: number): WorldObject {
  return worldObj(x, y, outlined(() => firewoodSprite()));
}
export function kettleObj(x: number, y: number): WorldObject {
  return worldObj(x, y, outlined(() => kettleSprite()));
}
export function cropRowObj(x: number, y: number, stage: 0 | 1 | 2, variant: number): WorldObject {
  return worldObj(x, y, outlined(() => cropRowSprite(stage, variant)));
}
export function stoolObj(x: number, y: number): WorldObject {
  return worldObj(x, y, outlined(() => stoolSprite()));
}
export function toolObj(x: number, y: number, kind: "hoe" | "bucket"): WorldObject {
  return worldObj(x, y, outlined(() => toolSprite(kind)));
}

export function npcObj(
  x: number,
  y: number,
  npcId: string,
  phase = 0,
  shapeOverride?: BodyShape,
  hairOverride?: HairStyle,
): WorldObject {
  const def = getNPC(npcId);
  const pal = VILLAGER_PALETTES[def.paletteId] ?? VILLAGER_PALETTES.bimal;
  return worldObj(
    x,
    y,
    outlined((t) =>
      villagerSprite({
        id: npcId,
        shape: shapeOverride ?? def.shape,
        hairStyle: hairOverride ?? def.hairStyle,
        frame: idleFrame(t, 1400, phase),
        pal,
      }),
    ),
  );
}

/** A villager who walks a looping route, facing the way they travel and switching to a walk cycle. */
export function npcWalkerObj(npcId: string, route: Waypoint[], speed = 14, phase = 0): WorldObject {
  const def = getNPC(npcId);
  const pal = VILLAGER_PALETTES[def.paletteId] ?? VILLAGER_PALETTES.bimal;
  const first = route[0] ?? { x: 0, y: 0 };
  return worldObj(
    first.x,
    first.y,
    outlined((t) => {
      const w = walkRoute(route, speed, t);
      return villagerSprite({
        id: npcId,
        shape: def.shape,
        hairStyle: def.hairStyle,
        frame: idleFrame(t, w.moving ? 260 : 1400, phase),
        pal,
        pose: w.moving ? "walk" : "idle",
        facing: w.facing,
      });
    }),
    { pos: (t) => walkRoute(route, speed, t) },
  );
}

/** An animal that wanders a short looping route. */
export function animalWalkerObj(
  kind: "chicken" | "dog" | "goat",
  route: Waypoint[],
  speed = 9,
  phase = 0,
): WorldObject {
  const first = route[0] ?? { x: 0, y: 0 };
  return worldObj(
    first.x,
    first.y,
    outlined((t) => {
      const w = walkRoute(route, speed, t);
      const frame = idleFrame(t, w.moving ? 220 : 900, phase);
      if (kind === "chicken") return chickenSprite(frame);
      if (kind === "dog") return dogSprite(frame);
      return goatSprite(frame);
    }),
    { pos: (t) => walkRoute(route, speed, t) },
  );
}

export function animalObj(x: number, y: number, kind: "chicken" | "dog" | "goat", phase = 0): WorldObject {
  return worldObj(
    x,
    y,
    outlined((t) => {
      const frame = idleFrame(t, 900, phase);
      if (kind === "chicken") return chickenSprite(frame);
      if (kind === "dog") return dogSprite(frame);
      return goatSprite(frame);
    }),
  );
}
