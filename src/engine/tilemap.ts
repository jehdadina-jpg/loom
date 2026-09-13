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
  cliffTile,
  grassLipTile,
  cobbleTile,
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
  | "woodfloor"
  | "cliff"
  | "grasslip"
  | "cobble";

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
    case "cliff":
      return cliffTile(variantAt(gx, gy, 5));
    case "grasslip":
      return grassLipTile(variantAt(gx, gy, 4));
    case "cobble":
      return cobbleTile(variantAt(gx, gy, 6));
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
  drawGrassWindSweep(ctx, grid, originX, originY, time);
}

/**
 * A soft band of light drifts diagonally across the grass every few seconds, like a
 * breeze passing through. Cheap to draw (one gradient pass, no per-tile recompute) but
 * it's the single biggest thing that makes the ground read as alive rather than static.
 */
function drawGrassWindSweep(ctx: CanvasRenderingContext2D, grid: TileGrid, originX: number, originY: number, time: number) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (!rows || !cols) return;
  const w = cols * TILE;
  const h = rows * TILE;

  const period = 5200;
  const bandW = w * 0.5;
  const cyclePos = ((time % period) / period) * (w + bandW) - bandW;

  ctx.save();
  ctx.beginPath();
  ctx.rect(originX, originY, w, h);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";

  for (let gy = 0; gy < rows; gy++) {
    const row = grid[gy];
    for (let gx = 0; gx < cols; gx++) {
      if (row[gx] !== "grass" && row[gx] !== "flowergrass") continue;
      const cx = originX + gx * TILE + TILE / 2;
      const dist = cx - originX - cyclePos;
      if (Math.abs(dist) > bandW * 0.6) continue;
      const k = 1 - Math.abs(dist) / (bandW * 0.6);
      const alpha = Math.max(0, k) * 0.05;
      if (alpha <= 0.002) continue;
      ctx.fillStyle = `rgba(220,240,200,${alpha})`;
      ctx.fillRect(originX + gx * TILE, originY + gy * TILE, TILE, TILE);
    }
  }
  ctx.restore();
}

export { TILE };
