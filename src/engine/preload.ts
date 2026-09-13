import { buildLocation, LOCATION_IDS, todaySeed } from "../data/locations";
import { ACTIVITIES } from "../data/activities";
import { DEFAULT_PACK } from "../data/community/packs";
import { tileBitmapFor, type TileKind } from "./tilemap";
import { iconSprite, type IconName } from "./sprites/icons";
import { loomLogo, loomMark } from "./sprites/logo";

const ALL_TILES: TileKind[] = [
  "grass",
  "flowergrass",
  "dirt",
  "path",
  "pathEdgeTop",
  "pathEdgeBottom",
  "pathEdgeLeft",
  "pathEdgeRight",
  "water",
  "waterEdgeTop",
  "waterEdgeBottom",
  "waterEdgeLeft",
  "waterEdgeRight",
  "soil",
  "soilWet",
  "stonefloor",
  "woodfloor",
];

const ALL_ICONS: IconName[] = [
  "home",
  "market",
  "veranda",
  "waterpoint",
  "field",
  "community",
  "garden",
  "village",
  "person",
  "activity",
  "rest",
  "back",
];

/**
 * Warms every sprite the game will need before the first frame is shown.
 *
 * All the art here is generated at runtime, so without this the first visit to each
 * location would hitch while dozens of bitmaps are rasterised. Work is sliced across
 * animation frames so the loading bar keeps moving instead of freezing the tab.
 */
export async function preloadAssets(onProgress: (fraction: number, label: string) => void): Promise<void> {
  const seed = todaySeed();
  const steps: { label: string; run: () => void }[] = [];

  steps.push({
    label: "Carving the sign",
    run: () => {
      loomLogo();
      loomMark();
      ALL_ICONS.forEach((n) => iconSprite(n));
    },
  });

  steps.push({
    label: "Laying the ground",
    run: () => {
      // several variants per tile kind, matching what the tilemap picks at runtime
      for (const kind of ALL_TILES) {
        for (let v = 0; v < 6; v++) tileBitmapFor(kind, v, v * 3, v * 400);
      }
    },
  });

  for (const id of LOCATION_IDS) {
    steps.push({
      label: `Building the ${id === "path" ? "village" : id}`,
      run: () => {
        const scene = buildLocation(id, DEFAULT_PACK, seed);
        // two passes so both idle animation frames get rasterised up front
        for (const time of [0, 800]) {
          for (const obj of scene.objects(time)) obj.bitmap(time);
        }
      },
    });
  }

  steps.push({
    label: "Setting out the baskets",
    run: () => {
      for (const a of ACTIVITIES) {
        for (const o of [...(a.options ?? []), ...(a.steps ?? [])]) o.render();
      }
    },
  });

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    onProgress(i / steps.length, step.label);
    step.run();
    // yield to the browser so the progress bar actually paints between steps
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  }
  onProgress(1, "Ready");
}
