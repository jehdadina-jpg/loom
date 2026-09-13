/**
 * LOOM master palette.
 *
 * Figure/ground rule: the GROUND is muted, dark and low-contrast so it reads as a quiet
 * surface. ENTITIES (people, animals, props, buildings) are more saturated, carry brighter
 * highlights, and get a dark outline — so they always separate from the terrain.
 * Light source convention: top-left.
 */
export const PAL = {
  // ---- ground: deliberately desaturated + tight value range so objects pop over it
  grassShadow: "#22562b",
  grassDark: "#2b6e3b",
  grassBase: "#33813f",
  grassMid: "#3b8e45",
  grassHi: "#439c48",
  grassFleck: "#4fab4d",

  // ---- paths: warm + distinctly lighter than grass so routes read instantly
  dirtShadow: "#644420",
  dirtDark: "#85592c",
  dirtBase: "#a8763a",
  dirtMid: "#bb8747",
  dirtHi: "#c6985d",
  dirtFleck: "#d4aa75",

  // ---- tilled soil (fields/garden): darker + redder than paths
  soilShadow: "#4e321a",
  soilDark: "#654021",
  soilBase: "#7a4d29",
  soilMid: "#8c5a31",
  soilHi: "#a06a3d",

  // stone
  stoneShadow: "#3d4b61",
  stoneDark: "#536684",
  stoneBase: "#7289a6",
  stoneMid: "#95aabf",
  stoneHi: "#becddb",

  // water
  waterDeep: "#13597a",
  waterDark: "#18769c",
  waterBase: "#2194bc",
  waterMid: "#4aaccd",
  waterHi: "#88d5e7",
  waterFoam: "#ebfbfd",

  // wood
  woodShadow: "#381e11",
  woodDark: "#56311a",
  woodBase: "#7c4c27",
  woodMid: "#9c662e",
  woodHi: "#c0843f",
  woodPale: "#d59f5c",

  // painted door accent (kept distinct from wood tones so doors read against walls)
  doorShadow: "#561f19",
  doorBase: "#9b392a",
  doorMid: "#bc4c3a",
  doorHi: "#d77c66",
  frameCream: "#eee2c4",

  // thatch / roof
  thatchShadow: "#6a3e14",
  thatchDark: "#8c531a",
  thatchBase: "#ae6f21",
  thatchMid: "#d08b2b",
  thatchHi: "#e7a948",

  // stone roof tile alt
  roofSlateShadow: "#412a4a",
  roofSlateDark: "#5c3b6a",
  roofSlateBase: "#7b528f",
  roofSlateMid: "#9c6faf",

  // foliage — brighter than the ground grass on purpose, so trees read as objects
  leafShadow: "#174b21",
  leafDark: "#247d30",
  leafBase: "#34a53e",
  leafMid: "#54c452",
  leafHi: "#86e26f",
  trunkShadow: "#3d250c",
  trunkDark: "#5a3313",
  trunkBase: "#7b481b",

  // sky / mountains
  skyTop: "#7acaf2",
  skyMid: "#aae1f4",
  skyLow: "#dcf5ea",
  cloudBase: "#ffffff",
  cloudShadow: "#d1ebf3",
  mtnFar: "#8cb4c5",
  mtnMid: "#66aa9b",
  mtnNear: "#45946d",
  mtnSnow: "#f9fdfc",

  // skin tones
  skin1: "#e8b98c",
  skin1Sh: "#c8946a",
  skin2: "#c98f5e",
  skin2Sh: "#a66d40",
  skin3: "#8a5a35",
  skin3Sh: "#6b4025",
  skin4: "#5f3a22",
  skin4Sh: "#452716",

  // hair
  hairBlack: "#241a14",
  hairBlackHi: "#3a2c22",
  hairGrey: "#9a9a95",
  hairGreyHi: "#c2c2bc",
  hairBrown: "#4a3221",
  hairBrownHi: "#6b4a2f",
  hairWhite: "#e8e4dc",
  hairWhiteSh: "#c3beb2",

  // cloth accents (kept generic/pan-regional, not tied to one culture)
  clothRed: "#d13d36",
  clothRedSh: "#9d2420",
  clothMaroon: "#a02c53",
  clothMaroonSh: "#6d1c3a",
  clothBlue: "#3d74ba",
  clothBlueSh: "#274e85",
  clothTeal: "#25a299",
  clothTealSh: "#16716d",
  clothMustard: "#eab338",
  clothMustardSh: "#bb891e",
  clothCream: "#f5e9cc",
  clothCreamSh: "#d6c498",
  clothIndigo: "#464e9c",
  clothIndigoSh: "#2c3379",

  // props
  basketBase: "#b48339",
  basketDark: "#7f5b26",
  cropGreen: "#4eb651",
  cropGreenHi: "#84dd71",
  cropYellow: "#f3c845",
  fruitRed: "#e15143",
  fruitOrange: "#f99e3c",

  // ui / misc
  outline: "#1b1410",
  ink: "#2c1e14",
  white: "#ffffff",
  black: "#000000",
  none: "transparent",
} as const;

export type PaletteKey = keyof typeof PAL;
