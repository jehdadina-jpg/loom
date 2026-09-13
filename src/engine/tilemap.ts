import { hashNoise } from "./pixelArt";
import {
  TILE,
  dirtTile,
  flowerGrassTile,
  grassTile,
  pathEdgeTile,
  pathTile,
  soilTile,
  stoneFloorTile,
  waterEdgeTile,
  waterTile,
  woodFloorTile,
} from "./sprites/terrain";

export type TileKind =
  | "grass"
  | "flowergrass"
  | "dirt"
  | "path"
  | "pathEdgeTop"
  | "pathEdgeBottom"
  | "pathEdgeLeft"
  | "pathEdgeRight"
  | "water"
  | "waterEdgeTop"
  | "waterEdgeBottom"
  | "waterEdgeLeft"
  | "waterEdgeRight"
  | "soil"
  | "soilWet"
  | "stonefloor"
  | "woodfloor";

export type TileGrid = TileKind[][];

function variantAt(gx: number, gy: number, mod: number): number {
  return Math.floor(hashNoise(gx, gy, 41) * mod);
}

export function tileBitmapFor(kind: TileKind, gx: number, gy: number, time: number): HTMLCanvasElement {
  const waterFrame = (Math.floor(time / 350) % 4) as number;
  switch (kind) {
    case "grass":
      return grassTile(variantAt(gx, gy, 6));
    case "flowergrass":
      return flowerGrassTile(variantAt(gx, gy, 4));
    case "dirt":
      return dirtTile(variantAt(gx, gy, 5));
    case "path":
      return pathTile(variantAt(gx, gy, 5));
    case "pathEdgeTop":
      return pathEdgeTile("top", variantAt(gx, gy, 4));
    case "pathEdgeBottom":
      return pathEdgeTile("bottom", variantAt(gx, gy, 4));
    case "pathEdgeLeft":
      return pathEdgeTile("left", variantAt(gx, gy, 4));
    case "pathEdgeRight":
      return pathEdgeTile("right", variantAt(gx, gy, 4));
    case "water":
      return waterTile(waterFrame);
    case "waterEdgeTop":
      return waterEdgeTile("top", waterFrame);
    case "waterEdgeBottom":
      return waterEdgeTile("bottom", waterFrame);
    case "waterEdgeLeft":
      return waterEdgeTile("left", waterFrame);
    case "waterEdgeRight":
      return waterEdgeTile("right", waterFrame);
    case "soil":
      return soilTile(variantAt(gx, gy, 4), false);
    case "soilWet":
      return soilTile(variantAt(gx, gy, 4), true);
    case "stonefloor":
      return stoneFloorTile(variantAt(gx, gy, 4));
    case "woodfloor":
      return woodFloorTile(variantAt(gx, gy, 4));
  }
}

export function drawTileGrid(
  ctx: CanvasRenderingContext2D,
  grid: TileGrid,
  originX: number,
  originY: number,
  time: number,
) {
  for (let gy = 0; gy < grid.length; gy++) {
    const row = grid[gy];
    for (let gx = 0; gx < row.length; gx++) {
      const bmp = tileBitmapFor(row[gx], gx, gy, time);
      ctx.drawImage(bmp, originX + gx * TILE, originY + gy * TILE);
    }
  }
}

export { TILE };
