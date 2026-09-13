import type { CommunityPack } from "../community/packs";
import type { LocationScene, Hotspot, LocationBuilder } from "./types";
import { EASTER_EGGS } from "./easterEggs";
import { activityFromPool } from "../activities";
import {
  filledGrid,
  pathRegion,
  waterRegion,
  paintRegion,
  treeObj,
  bushObj,
  rockObj,
  flowerObj,
  grassTuftObj,
  reedObj,
  houseObj,
  fenceObj,
  stallObj,
  verandaRailObj,
  waterPlatformObj,
  wellObj,
  signpostObj,
  basketObj,
  potObj,
  crateObj,
  benchObj,
  firewoodObj,
  cropRowObj,
  stoolObj,
  toolObj,
  kettleObj,
  npcObj,
  npcWalkerObj,
  animalObj,
  animalWalkerObj,
  bigTreeObj,
  pineObj,
  barrelObj,
  hayObj,
  ladderObj,
  lanternPostObj,
  wagonObj,
  far,
} from "./factories";

const COLS = 32;

/** Stable per-day pseudo-random so the village feels alive but never rearranges itself mid-session. */
function vary(seed: number, salt: number, range: number): number {
  const n = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return Math.floor((n - Math.floor(n)) * range);
}

function cropStage(seed: number, salt: number): 0 | 1 | 2 {
  return vary(seed, salt, 3) as 0 | 1 | 2;
}

// ---------------------------------------------------------------- PATH (village hub)
const buildPath: LocationBuilder = (pack, seed) => {
  // A street seen from above: cobbles run up the middle toward the hills and widen as
  // they come toward you, houses flank both sides, and everything far away is smaller.
  const grid = filledGrid(COLS, 15, "grass");
  paintRegion(grid, 14, 0, 17, 3, { fill: "cobble" });
  paintRegion(grid, 13, 4, 18, 7, { fill: "cobble" });
  paintRegion(grid, 12, 8, 19, 11, { fill: "cobble" });
  paintRegion(grid, 11, 12, 20, 14, { fill: "cobble" });
  // side lanes off to the garden and the market
  paintRegion(grid, 4, 9, 12, 9, { fill: "path" });
  paintRegion(grid, 19, 6, 27, 6, { fill: "path" });
  // a terrace step along the far top edge with the field above it
  paintRegion(grid, 0, 0, 13, 0, { fill: "grasslip" });
  paintRegion(grid, 18, 0, COLS - 1, 0, { fill: "grasslip" });

  const hotspots: Hotspot[] = [
    {
      id: "to-field",
      x: 196,
      y: 56,
      w: 118,
      h: 44,
      label: "Field",
      description: "Terraces up the hill",
      kind: "place",
      action: { type: "navigate", to: "field" },
    },
    {
      id: "to-community",
      x: 330,
      y: 80,
      w: 90,
      h: 70,
      label: "Community",
      description: "Neighbours gather under the big tree",
      kind: "place",
      action: { type: "navigate", to: "community" },
    },
    {
      id: "to-waterpoint",
      x: 92,
      y: 90,
      w: 80,
      h: 60,
      label: "Water Point",
      description: "A quiet place to sit and rest",
      kind: "place",
      action: { type: "navigate", to: "waterpoint" },
    },
    {
      id: "to-market",
      x: 380,
      y: 148,
      w: 118,
      h: 74,
      label: "Market",
      description: "Ilo's fruit and vegetable stalls",
      kind: "place",
      action: { type: "navigate", to: "market" },
    },
    {
      id: "to-garden",
      x: 30,
      y: 190,
      w: 100,
      h: 56,
      label: "Garden",
      description: "Vegetable beds behind the fence",
      kind: "place",
      action: { type: "navigate", to: "garden" },
    },
    {
      id: "to-home",
      x: 8,
      y: 96,
      w: 120,
      h: 96,
      label: "Home",
      description: "Your porch, the hearth, and family",
      kind: "place",
      action: { type: "navigate", to: "home" },
    },
  ];

  return {
    id: "path",
    name: `${pack.villageName[0].toUpperCase()}${pack.villageName.slice(1)}`,
    subtitle: "Tap a place to visit it",
    horizonRatio: 0.2,
    terraces: true,
    groundKind: "grass",
    tileGrid: grid,
    hotspots,
    ambience: "village",
    lights: [
      { x: 52, y: 150, radius: 36, color: "#ffcf7d", nightOnly: true },
      { x: 460, y: 150, radius: 36, color: "#ffcf7d", nightOnly: true },
      { x: 134, y: 90, radius: 26, color: "#ffcf7d", nightOnly: true },
      { x: 392, y: 92, radius: 26, color: "#ffcf7d", nightOnly: true },
      { x: 214, y: 178, radius: 30, color: "#ffd08a", nightOnly: true, flicker: true },
      { x: 300, y: 236, radius: 30, color: "#ffd08a", nightOnly: true, flicker: true },
      { x: 430, y: 206, radius: 34, color: "#ffd08a", nightOnly: true, flicker: true },
      { x: 372, y: 156, radius: 36, color: "#fff2b0", dayOnly: true },
      { x: 40, y: 118, radius: 26, color: "#fff2b0", dayOnly: true },
      { x: 474, y: 116, radius: 26, color: "#fff2b0", dayOnly: true },
    ],
    emitters: [
      { id: "chimney-l", kind: "smoke", x: 74, y: 96, rate: 5, spreadX: 2 },
      { id: "chimney-r", kind: "smoke", x: 478, y: 98, rate: 4, spreadX: 2 },
      { id: "butterflies", kind: "butterfly", x: -10, y: 236, rate: 0.22, spreadY: 40, dayOnly: true },
      { id: "motes", kind: "dust", x: 256, y: 200, rate: 2, spreadX: 400, spreadY: 120, dayOnly: true },
      { id: "fireflies", kind: "firefly", x: 256, y: 210, rate: 3, spreadX: 440, spreadY: 120, nightOnly: true },
    ],
    objects: () => [
      // far row: small houses and trees against the hills
      far(houseObj(140, 118, { variant: 3, width: 80, accent: "#a83b3b" }), 0.7),
      far(houseObj(388, 120, { variant: 4, width: 80, accent: "#4a72a6" }), 0.7),
      far(bigTreeObj(40, 112, 2), 0.7),
      far(bigTreeObj(474, 110, 3), 0.7),
      far(pineObj(232, 104, 0), 0.7),
      far(pineObj(292, 106, 1), 0.7),
      far(signpostObj(200, 100, "none"), 0.7),
      // community tree and benches, mid-right
      bigTreeObj(372, 150, 0),
      far(benchObj(350, 152), 0.85),
      far(stoolObj(400, 150), 0.85),
      // water point, mid-left
      far(wellObj(132, 148), 0.85),
      far(reedObj(110, 150, 1), 0.85),
      far(toolObj(150, 146, "bucket"), 0.85),
      // the two big houses that frame the street
      houseObj(64, 192, { variant: 1, width: 104, accent: "#2f9089" }),
      houseObj(448, 194, { variant: 2, width: 104, accent: "#c0453f" }),
      barrelObj(126, 190),
      hayObj(20, 196),
      ladderObj(118, 176),
      // market stall + wagon near the right house
      stallObj(432, 236, 0, pack.accent),
      wagonObj(468, 246),
      crateObj(400, 240),
      barrelObj(484, 226),
      // garden strip along the lower left
      fenceObj(20, 232, 0),
      fenceObj(36, 232, 1),
      fenceObj(52, 232, 2),
      fenceObj(68, 232, 3),
      cropRowObj(28, 250, cropStage(seed, 1), 0),
      cropRowObj(50, 250, cropStage(seed, 2), 1),
      cropRowObj(72, 250, cropStage(seed, 3), 0),
      // hedges and greenery hugging the road
      bushObj(176, 214, 0),
      bushObj(186, 246, 1),
      bushObj(336, 218, 2),
      bushObj(330, 250, 0),
      flowerObj(172, 262, 1),
      flowerObj(340, 266, 3),
      rockObj(118, 270, 1),
      grassTuftObj(96, 282, 0),
      grassTuftObj(392, 282, 2),
      // street lamps march down the road
      far(lanternPostObj(214, 182), 0.8),
      far(lanternPostObj(300, 240), 0.9),
      lanternPostObj(196, 286),
      lanternPostObj(322, 286),
      // people spread through the depth of the street
      far(npcObj(256, 132, "ramal", 0.1), 0.7),
      far(npcObj(238, 176, "deeplia", 0.5), 0.82),
      npcWalkerObj(
        "naren",
        [
          { x: 230, y: 214, pause: 2 },
          { x: 286, y: 262, pause: 2 },
          { x: 242, y: 280, pause: 1.5 },
        ],
        14,
        0.2,
      ),
      npcObj(414, 258, "vendor", 0.6),
      npcObj(272, 232, "bimal", 0.35),
      npcObj(206, 262, "rumak", 0.9),
      animalWalkerObj(
        "chicken",
        [
          { x: 150, y: 264, pause: 1.5 },
          { x: 176, y: 276, pause: 2 },
        ],
        7,
        0.1,
      ),
      animalObj(370, 274, "dog", 0.4),
    ],
  };
};

// ---------------------------------------------------------------- HOME
const buildHome: LocationBuilder = (_pack, seed) => {
  const grid = filledGrid(COLS, 11, "grass");
  paintRegion(grid, 4, 3, 26, 10, { fill: "woodfloor" });

  const hotspots: Hotspot[] = [
    {
      id: "talk-ramal",
      x: 62,
      y: 196,
      w: 56,
      h: 66,
      label: "Ramal",
      description: "Say hello to your elder",
      kind: "person",
      action: { type: "dialogue", npcId: "ramal" },
    },
    {
      id: "activity",
      x: 196,
      y: 190,
      w: 110,
      h: 72,
      label: "Make Tea",
      description: "Put the kettle on, step by step",
      kind: "activity",
      action: { type: "activityPool", poolId: "home-hearth" },
    },
    {
      id: "activity2",
      x: 312,
      y: 214,
      w: 86,
      h: 52,
      label: "Around the House",
      description: "Something to sort out indoors",
      kind: "activity",
      action: { type: "activityPool", poolId: "home-things" },
    },
    {
      id: "talk-bimal",
      x: 348,
      y: 196,
      w: 56,
      h: 66,
      label: "Bimal",
      description: "Your son is back from the field",
      kind: "person",
      action: { type: "dialogue", npcId: "bimal" },
    },
    {
      id: "to-veranda",
      x: 424,
      y: 168,
      w: 72,
      h: 84,
      label: "Veranda",
      description: "Sit with the family, look over the valley",
      kind: "place",
      action: { type: "navigate", to: "veranda" },
    },
  ];

  return {
    id: "home",
    name: "Home",
    subtitle: "The porch in front of your house",
    horizonRatio: 0.4,
    terraces: false,
    groundKind: "woodfloor",
    tileGrid: grid,
    hotspots,
    backTo: "path",
    ambience: "indoor",
    lights: [
      { x: 214, y: 196, radius: 40, color: "#ffd28a", nightOnly: true },
      { x: 244, y: 250, radius: 44, color: "#ffa653", flicker: true },
    ],
    emitters: [
      { id: "hearth-smoke", kind: "smoke", x: 244, y: 244, rate: 7, spreadX: 3 },
      { id: "hearth-ember", kind: "ember", x: 244, y: 250, rate: 2.4, spreadX: 5 },
      { id: "porch-motes", kind: "dust", x: 256, y: 240, rate: 1.4, spreadX: 300, spreadY: 40, dayOnly: true },
    ],
    objects: () => [
      houseObj(250, 214, { variant: 2, width: 150, accent: "#4a72a6", withStilts: false }),
      verandaRailObj(444, 196, 0),
      verandaRailObj(460, 196, 1),
      barrelObj(52, 214),
      hayObj(456, 214),
      lanternPostObj(140, 210),
      benchObj(212, 244),
      stoolObj(160, 250),
      kettleObj(244, 252),
      firewoodObj(268, 258),
      potObj(312, 250, 0),
      potObj(330, 254, 1),
      basketObj(356, 252, vary(seed, 7, 4)),
      crateObj(384, 254),
      toolObj(128, 246, "bucket"),
      bushObj(70, 244, 1),
      bushObj(468, 250, 0),
      flowerObj(182, 264, 1),
      flowerObj(348, 268, 3),
      fenceObj(4, 236, 2),
      npcObj(90, 252, "ramal", 0),
      npcObj(374, 250, "bimal", 0.5),
      animalWalkerObj(
        "chicken",
        [
          { x: 410, y: 262, pause: 2 },
          { x: 440, y: 268, pause: 1.5 },
        ],
        6,
        0.3,
      ),
    ],
  };
};

// ---------------------------------------------------------------- MARKET
const buildMarket: LocationBuilder = (pack, seed) => {
  const grid = filledGrid(COLS, 11, "dirt");
  paintRegion(grid, 0, 4, COLS - 1, 6, { fill: "path" });

  const hotspots: Hotspot[] = [
    {
      id: "identify",
      x: 24,
      y: 176,
      w: 100,
      h: 76,
      label: "Find a Basket",
      description: "Pick out the woven basket",
      kind: "activity",
      action: { type: "activityPool", poolId: "market-left" },
    },
    {
      id: "vendor",
      x: 214,
      y: 198,
      w: 56,
      h: 64,
      label: "Ilo",
      description: "The vegetable seller, always chatty",
      kind: "person",
      action: { type: "dialogue", npcId: "vendor" },
    },
    {
      id: "identify2",
      x: 324,
      y: 176,
      w: 100,
      h: 76,
      label: "Match a Fruit",
      description: "Find the fruit Ilo asks for",
      kind: "activity",
      action: { type: "activityPool", poolId: "market-right" },
    },
    {
      id: "road-activity",
      x: 432,
      y: 210,
      w: 72,
      h: 48,
      label: "Along the Road",
      description: "Something to notice on the way",
      kind: "activity",
      action: { type: "activityPool", poolId: "path-road" },
    },
  ];

  return {
    id: "market",
    name: "Market",
    subtitle: "Stalls along the village road",
    horizonRatio: 0.4,
    terraces: false,
    groundKind: "dirt",
    tileGrid: grid,
    hotspots,
    backTo: "path",
    ambience: "market",
    lights: [
      { x: 56, y: 182, radius: 30, color: "#ffd08a", nightOnly: true, flicker: true },
      { x: 262, y: 182, radius: 32, color: "#ffd08a", nightOnly: true, flicker: true },
      { x: 462, y: 182, radius: 30, color: "#ffd08a", nightOnly: true, flicker: true },
    ],
    emitters: [{ id: "market-motes", kind: "dust", x: 256, y: 236, rate: 2.2, spreadX: 460, spreadY: 46, dayOnly: true }],
    objects: () => [
      stallObj(56, 196, 0, pack.accent),
      stallObj(160, 200, 1, "#2f9089"),
      stallObj(262, 196, 2, pack.accent),
      stallObj(364, 200, 0, "#4a72a6"),
      stallObj(462, 196, 1, "#c0453f"),
      basketObj(24, 224, vary(seed, 8, 4)),
      basketObj(108, 226, 1),
      crateObj(218, 228),
      crateObj(416, 228),
      potObj(312, 228, 1),
      bigTreeObj(500, 214, 4),
      fenceObj(0, 186, 0),
      barrelObj(130, 226),
      barrelObj(146, 230),
      wagonObj(300, 232),
      lanternPostObj(212, 224),
      npcObj(240, 250, "vendor", 0),
      // a shopper working her way along the stalls
      npcWalkerObj(
        "deeplia",
        [
          { x: 120, y: 258, pause: 2.5 },
          { x: 300, y: 258, pause: 2.5 },
        ],
        13,
        0.7,
      ),
      npcObj(392, 252, "rumak", 0.35),
      animalWalkerObj(
        "dog",
        [
          { x: 320, y: 264, pause: 2 },
          { x: 372, y: 268, pause: 2 },
        ],
        11,
        0.2,
      ),
      grassTuftObj(20, 268, 3),
    ],
  };
};

// ---------------------------------------------------------------- VERANDA
const buildVeranda: LocationBuilder = (_pack, seed) => {
  const grid = filledGrid(COLS, 9, "woodfloor");

  const hotspots: Hotspot[] = [
    {
      id: "faces",
      x: 150,
      y: 186,
      w: 212,
      h: 78,
      label: "Who Is This?",
      description: "Name the family sitting with you",
      kind: "activity",
      action: { type: "activityPool", poolId: "veranda-faces" },
    },
    {
      id: "craft",
      x: 96,
      y: 196,
      w: 54,
      h: 58,
      label: "At the Loom",
      description: "Work a pattern into the cloth",
      kind: "activity",
      action: { type: "activityPool", poolId: "veranda-craft" },
    },
    {
      id: "talk-elder",
      x: 36,
      y: 196,
      w: 60,
      h: 66,
      label: "Ramal",
      description: "Share a moment with your elder",
      kind: "person",
      action: { type: "dialogue", npcId: "ramal" },
    },
    {
      id: "story",
      x: 400,
      y: 190,
      w: 96,
      h: 72,
      label: "Old Story",
      description: "Listen to a story about the valley",
      kind: "rest",
      action: { type: "comfort" },
    },
  ];

  return {
    id: "veranda",
    name: "Veranda",
    subtitle: "Looking out over the terraces",
    horizonRatio: 0.54,
    terraces: true,
    groundKind: "woodfloor",
    tileGrid: grid,
    hotspots,
    backTo: "home",
    ambience: "village",
    lights: [
      { x: 40, y: 206, radius: 34, color: "#ffcf7d", nightOnly: true, flicker: true },
      { x: 474, y: 206, radius: 34, color: "#ffcf7d", nightOnly: true, flicker: true },
    ],
    emitters: [
      { id: "veranda-motes", kind: "dust", x: 256, y: 230, rate: 1.8, spreadX: 420, spreadY: 40, dayOnly: true },
      { id: "veranda-flies", kind: "firefly", x: 256, y: 226, rate: 1.8, spreadX: 440, spreadY: 44, nightOnly: true },
      { id: "blossom", kind: "leaf", x: 520, y: 180, rate: 0.5, spreadY: 30, dayOnly: true },
    ],
    objects: () => [
      verandaRailObj(0, 196, 0),
      verandaRailObj(16, 196, 1),
      verandaRailObj(32, 196, 2),
      verandaRailObj(464, 196, 3),
      verandaRailObj(480, 196, 0),
      verandaRailObj(496, 196, 1),
      benchObj(196, 250),
      benchObj(320, 250),
      stoolObj(64, 254),
      potObj(30, 262, 2),
      potObj(486, 262, 3),
      basketObj(430, 258, vary(seed, 11, 4)),
      npcObj(62, 250, "ramal", 0),
      npcObj(186, 252, "bimal", 0.3),
      npcObj(232, 252, "deeplia", 0.6),
      npcObj(310, 254, "rumak", 0.9),
      npcObj(352, 254, "naren", 0.2),
    ],
  };
};

// ---------------------------------------------------------------- WATER POINT
const buildWaterPoint: LocationBuilder = (_pack, seed) => {
  const grid = filledGrid(COLS, 11, "grass");
  // pond sits in the middle band, leaving a generous grassy bank in the foreground to stand on
  waterRegion(grid, 6, 2, 28, 7);
  // chamfer the corners so the pond doesn't read as a rectangular tank
  for (const [gx, gy] of [
    [6, 2],
    [7, 2],
    [6, 3],
    [28, 2],
    [27, 2],
    [28, 3],
    [6, 7],
    [28, 7],
  ] as const) {
    grid[gy][gx] = "grass";
  }
  pathRegion(grid, 0, 8, 5, 9);

  const hotspots: Hotspot[] = [
    {
      id: "comfort",
      x: 176,
      y: 186,
      w: 168,
      h: 78,
      label: "Sit a While",
      description: "A story or a song — nothing to do here",
      kind: "rest",
      action: { type: "comfort" },
    },
    {
      id: "water-gentle",
      x: 386,
      y: 196,
      w: 82,
      h: 56,
      label: "Watch the Water",
      description: "Something slow, if you feel like it",
      kind: "activity",
      action: { type: "activityPool", poolId: "water-quiet" },
    },
  ];

  const groundY = Math.round(0.34 * 288);

  return {
    id: "waterpoint",
    stoneTower: true,
    name: "Water Point",
    subtitle: "A quiet place to rest",
    horizonRatio: 0.34,
    terraces: false,
    groundKind: "grass",
    tileGrid: grid,
    hotspots,
    backTo: "path",
    ambience: "water",
    noGuide: true,
    ambientNote: "Nothing to do here. Just rest.",
    waterRect: { x: 96, y: groundY + 34, w: 368, h: 92 },
    lights: [{ x: 196, y: 240, radius: 34, color: "#ffd9a0", nightOnly: true, flicker: true }],
    emitters: [
      { id: "pond-flies", kind: "firefly", x: 256, y: 240, rate: 3.4, spreadX: 420, spreadY: 60, nightOnly: true },
      { id: "pond-motes", kind: "dust", x: 256, y: 234, rate: 1.4, spreadX: 400, spreadY: 40, dayOnly: true },
      { id: "reed-butterfly", kind: "butterfly", x: -10, y: 250, rate: 0.18, spreadY: 20, dayOnly: true },
    ],
    objects: () => [
      waterPlatformObj(196, 244),
      reedObj(96, 236, 0),
      reedObj(110, 240, 1),
      reedObj(418, 236, 2),
      reedObj(432, 242, 0),
      rockObj(140, 250, 0),
      rockObj(386, 254, 1),
      pineObj(46, 214, 5),
      bigTreeObj(470, 212, 6),
      benchObj(268, 266),
      basketObj(168, 268, vary(seed, 12, 4)),
      grassTuftObj(330, 272, 3),
      grassTuftObj(366, 264, 4),
      flowerObj(120, 272, 1),
      flowerObj(444, 268, 2),
      npcObj(306, 268, "rumak", 0.4),
    ],
  };
};

// ---------------------------------------------------------------- FIELD
const buildField: LocationBuilder = (_pack, seed) => {
  const grid = filledGrid(COLS, 11, "soil");
  paintRegion(grid, 0, 0, COLS - 1, 2, { fill: "grass" });
  // retaining ridges between terrace steps, so the hillside reads as stepped ground
  paintRegion(grid, 0, 5, COLS - 1, 5, { fill: "dirt" });
  paintRegion(grid, 0, 8, COLS - 1, 8, { fill: "dirt" });
  paintRegion(grid, 14, 0, 16, 10, { fill: "path" });

  const hotspots: Hotspot[] = [
    {
      id: "harvest",
      x: 44,
      y: 186,
      w: 112,
      h: 76,
      label: "Ready to Pick",
      description: "Find the row that's ripe",
      kind: "activity",
      action: { type: "activityPool", poolId: "field-left" },
    },
    {
      id: "route",
      x: 320,
      y: 186,
      w: 112,
      h: 76,
      label: "Walk the Row",
      description: "Follow the path you always take",
      kind: "activity",
      action: { type: "activityPool", poolId: "field-right" },
    },
  ];

  return {
    id: "field",
    name: "Terrace Field",
    subtitle: "The hillside terraces",
    horizonRatio: 0.34,
    terraces: true,
    groundKind: "soil",
    tileGrid: grid,
    hotspots,
    backTo: "path",
    ambience: "field",
    emitters: [
      { id: "field-motes", kind: "dust", x: 256, y: 240, rate: 2.4, spreadX: 460, spreadY: 60, dayOnly: true },
      { id: "field-butterfly", kind: "butterfly", x: -10, y: 220, rate: 0.3, spreadY: 40, dayOnly: true },
      { id: "field-flies", kind: "firefly", x: 256, y: 236, rate: 1.6, spreadX: 440, spreadY: 50, nightOnly: true },
    ],
    objects: () => [
      cropRowObj(40, 214, cropStage(seed, 20), 0),
      cropRowObj(62, 214, cropStage(seed, 21), 1),
      cropRowObj(84, 214, cropStage(seed, 22), 0),
      cropRowObj(106, 214, cropStage(seed, 23), 1),
      cropRowObj(196, 232, cropStage(seed, 24), 1),
      cropRowObj(218, 232, cropStage(seed, 25), 0),
      cropRowObj(330, 216, cropStage(seed, 26), 0),
      cropRowObj(352, 216, cropStage(seed, 27), 1),
      cropRowObj(374, 216, cropStage(seed, 28), 0),
      cropRowObj(396, 216, cropStage(seed, 29), 1),
      basketObj(140, 248, 0),
      toolObj(272, 240, "hoe"),
      signpostObj(240, 206, "none"),
      fenceObj(2, 250, 0),
      fenceObj(496, 250, 1),
      pineObj(470, 204, 2),
      hayObj(60, 250),
      hayObj(84, 254),
      wagonObj(300, 248),
      npcWalkerObj(
        "bimal",
        [
          { x: 150, y: 254, pause: 3 },
          { x: 250, y: 254, pause: 2 },
        ],
        11,
        0.2,
      ),
      animalWalkerObj(
        "goat",
        [
          { x: 420, y: 258, pause: 3 },
          { x: 460, y: 262, pause: 2.5 },
        ],
        6,
        0.5,
      ),
      grassTuftObj(20, 200, 2),
    ],
  };
};

// ---------------------------------------------------------------- COMMUNITY
const buildCommunity: LocationBuilder = (_pack, seed) => {
  const grid = filledGrid(COLS, 11, "grass");
  paintRegion(grid, 9, 4, 23, 10, { fill: "stonefloor" });
  pathRegion(grid, 0, 7, 8, 8);

  const hotspots: Hotspot[] = [
    {
      id: "circle",
      x: 178,
      y: 184,
      w: 160,
      h: 78,
      label: "Join the Circle",
      description: "Sit down with the neighbours",
      kind: "activity",
      action: { type: "activityPool", poolId: "community-circle" },
    },
    {
      id: "firepit",
      x: 66,
      y: 206,
      w: 74,
      h: 56,
      label: "At the Fire",
      description: "Get the fire pit going",
      kind: "activity",
      action: { type: "activityPool", poolId: "community-fire" },
    },
    {
      id: "talk-deeplia",
      x: 372,
      y: 198,
      w: 58,
      h: 64,
      label: "Deeplia",
      description: "Catch up on village news",
      kind: "person",
      action: { type: "dialogue", npcId: "deeplia" },
    },
  ];

  return {
    id: "community",
    name: "Community Area",
    subtitle: "Where the village gathers",
    horizonRatio: 0.38,
    terraces: false,
    groundKind: "grass",
    tileGrid: grid,
    hotspots,
    backTo: "path",
    ambience: "village",
    lights: [{ x: 244, y: 252, radius: 52, color: "#ff9d46", flicker: true }],
    emitters: [
      { id: "firepit-smoke", kind: "smoke", x: 244, y: 246, rate: 6, spreadX: 4 },
      { id: "firepit-ember", kind: "ember", x: 244, y: 250, rate: 3, spreadX: 6 },
      { id: "tree-leaves", kind: "leaf", x: 300, y: 190, rate: 0.5, spreadX: 60, spreadY: 20, dayOnly: true },
      { id: "comm-flies", kind: "firefly", x: 256, y: 240, rate: 2, spreadX: 380, spreadY: 44, nightOnly: true },
    ],
    objects: () => [
      bigTreeObj(256, 190, 7),
      lanternPostObj(150, 232),
      lanternPostObj(362, 232),
      benchObj(186, 248),
      benchObj(326, 248),
      benchObj(256, 262),
      firewoodObj(240, 256),
      basketObj(300, 260, vary(seed, 14, 4)),
      potObj(196, 262, 1),
      fenceObj(40, 218, 0),
      fenceObj(456, 218, 1),
      treeObj(72, 214, 3, "tall"),
      treeObj(452, 210, 4, "round"),
      npcObj(214, 252, "ramal", 0),
      // a grandchild circling the gathering
      npcWalkerObj(
        "naren",
        [
          { x: 268, y: 256, pause: 1.5 },
          { x: 330, y: 262, pause: 1 },
          { x: 292, y: 268, pause: 1.5 },
        ],
        18,
        0.8,
      ),
      npcObj(396, 252, "deeplia", 0.5),
      animalObj(360, 262, "dog", 0.3),
      grassTuftObj(120, 268, 1),
      flowerObj(430, 266, 2),
    ],
  };
};

// ---------------------------------------------------------------- GARDEN
const buildGarden: LocationBuilder = (_pack, seed) => {
  const grid = filledGrid(COLS, 11, "grass");
  paintRegion(grid, 4, 4, 27, 10, { fill: "soil" });
  pathRegion(grid, 0, 7, 3, 8);

  const hotspots: Hotspot[] = [
    {
      id: "water-plants",
      x: 168,
      y: 188,
      w: 168,
      h: 74,
      label: "Water the Rows",
      description: "Give each row a drink, in order",
      kind: "activity",
      action: { type: "activityPool", poolId: "garden-rows" },
    },
    {
      id: "beds",
      x: 60,
      y: 214,
      w: 80,
      h: 52,
      label: "In the Beds",
      description: "Look over what's growing",
      kind: "activity",
      action: { type: "activityPool", poolId: "garden-beds" },
    },
    {
      id: "talk-rumak",
      x: 386,
      y: 200,
      w: 56,
      h: 62,
      label: "Rumak",
      description: "Your grandchild picked flowers",
      kind: "person",
      action: { type: "dialogue", npcId: "rumak" },
    },
  ];

  return {
    id: "garden",
    name: "Garden",
    subtitle: "The beds behind the house",
    horizonRatio: 0.4,
    terraces: false,
    groundKind: "soil",
    tileGrid: grid,
    hotspots,
    backTo: "path",
    ambience: "field",
    emitters: [
      { id: "garden-butterfly", kind: "butterfly", x: -10, y: 240, rate: 0.45, spreadY: 40, dayOnly: true },
      { id: "garden-motes", kind: "dust", x: 256, y: 244, rate: 1.8, spreadX: 400, spreadY: 40, dayOnly: true },
      { id: "garden-flies", kind: "firefly", x: 256, y: 240, rate: 1.8, spreadX: 400, spreadY: 44, nightOnly: true },
    ],
    objects: () => [
      fenceObj(68, 204, 0),
      fenceObj(84, 204, 1),
      fenceObj(404, 204, 2),
      fenceObj(420, 204, 3),
      cropRowObj(110, 238, cropStage(seed, 30), 0),
      cropRowObj(132, 238, cropStage(seed, 31), 1),
      cropRowObj(154, 238, cropStage(seed, 32), 0),
      cropRowObj(266, 242, cropStage(seed, 33), 0),
      cropRowObj(288, 242, cropStage(seed, 34), 1),
      cropRowObj(310, 242, cropStage(seed, 35), 0),
      flowerObj(206, 258, 1),
      flowerObj(344, 256, 3),
      toolObj(360, 232, "bucket"),
      basketObj(238, 258, vary(seed, 16, 4)),
      bushObj(58, 244, 2),
      bushObj(452, 240, 0),
      bigTreeObj(28, 228, 6),
      barrelObj(468, 222),
      npcObj(410, 254, "rumak", 0.3),
      animalWalkerObj(
        "chicken",
        [
          { x: 270, y: 262, pause: 1.5 },
          { x: 310, y: 268, pause: 2 },
          { x: 286, y: 272, pause: 1 },
        ],
        7,
        0.6,
      ),
      grassTuftObj(480, 266, 2),
    ],
  };
};

const BUILDERS: Record<string, LocationBuilder> = {
  path: buildPath,
  home: buildHome,
  market: buildMarket,
  veranda: buildVeranda,
  waterpoint: buildWaterPoint,
  field: buildField,
  community: buildCommunity,
  garden: buildGarden,
};

export function buildLocation(id: string, pack: CommunityPack, seed = 0, rotation = 0): LocationScene {
  const builder = BUILDERS[id] ?? BUILDERS.path;
  const scene = builder(pack, seed);

  // Pool-backed plaques resolve to whichever activity is on offer this visit, and take
  // that activity's name — so the label always tells the truth about what's behind it.
  const hotspots = scene.hotspots.map((h) => {
    if (h.action.type !== "activityPool") return h;
    const activity = activityFromPool(h.action.poolId, rotation);
    if (!activity) return h;
    return {
      ...h,
      label: activity.title,
      description: activity.prompt,
      action: { type: "activity" as const, activityId: activity.id },
    };
  });

  return { ...scene, hotspots, easterEggs: EASTER_EGGS[scene.id] ?? [] };
}

export const LOCATION_IDS = Object.keys(BUILDERS);

/** Day-stable seed so the village varies between visits but stays put within a session. */
export function todaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
