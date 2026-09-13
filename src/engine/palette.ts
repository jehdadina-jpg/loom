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
  grassShadow: "#25412a",
  grassDark: "#31563a",
  grassBase: "#3b6742",
  grassMid: "#44734a",
  grassHi: "#4e7f51",
  grassFleck: "#5b8c5a",

  // ---- paths: warm + distinctly lighter than grass so routes read instantly
  dirtShadow: "#4d3a25",
  dirtDark: "#6b5034",
  dirtBase: "#8a6b46",
  dirtMid: "#9c7c54",
  dirtHi: "#ae8d63",
  dirtFleck: "#c0a077",

  // ---- tilled soil (fields/garden): darker + redder than paths
  soilShadow: "#3a2a1c",
  soilDark: "#4e3826",
  soilBase: "#614630",
  soilMid: "#71533a",
  soilHi: "#836348",

  // stone
  stoneShadow: "#41454b",
  stoneDark: "#5c6169",
  stoneBase: "#7b828b",
  stoneMid: "#99a1a9",
  stoneHi: "#bcc4cb",

  // water
  waterDeep: "#1a4a61",
  waterDark: "#236580",
  waterBase: "#2f809d",
  waterMid: "#52a2bd",
  waterHi: "#8bcddd",
  waterFoam: "#e6f8fb",

  // wood
  woodShadow: "#2e1c13",
  woodDark: "#4a2f1e",
  woodBase: "#6d4a2f",
  woodMid: "#8a6238",
  woodHi: "#ab7f4c",
  woodPale: "#c79a63",

  // painted door accent (kept distinct from wood tones so doors read against walls)
  doorShadow: "#4a221d",
  doorBase: "#8a3f34",
  doorMid: "#a85447",
  doorHi: "#c97e6c",
  frameCream: "#eee2c4",

  // thatch / roof
  thatchShadow: "#5c3a1a",
  thatchDark: "#7c4f22",
  thatchBase: "#9c6a2c",
  thatchMid: "#bb8438",
  thatchHi: "#d9a34e",

  // stone roof tile alt
  roofSlateShadow: "#3a2e3f",
  roofSlateDark: "#54425c",
  roofSlateBase: "#725c7d",
  roofSlateMid: "#93789e",

  // foliage — brighter than the ground grass on purpose, so trees read as objects
  leafShadow: "#1b4022",
  leafDark: "#2b6e34",
  leafBase: "#3f9346",
  leafMid: "#5cb45b",
  leafHi: "#87d673",
  trunkShadow: "#33210f",
  trunkDark: "#4e3018",
  trunkBase: "#6c4522",

  // sky / mountains
  skyTop: "#7cc4e8",
  skyMid: "#a9dced",
  skyLow: "#d9f0e6",
  cloudBase: "#ffffff",
  cloudShadow: "#cfe6ee",
  mtnFar: "#8fa6b0",
  mtnMid: "#6f8f88",
  mtnNear: "#4f7864",
  mtnSnow: "#eef6f5",

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
  clothRed: "#c0453f",
  clothRedSh: "#8c2d2a",
  clothMaroon: "#8e3654",
  clothMaroonSh: "#5f2239",
  clothBlue: "#4a72a6",
  clothBlueSh: "#2f4c75",
  clothTeal: "#2f9089",
  clothTealSh: "#1c6360",
  clothMustard: "#dcab3f",
  clothMustardSh: "#a8802a",
  clothCream: "#f0e5ca",
  clothCreamSh: "#cbbd9c",
  clothIndigo: "#51568a",
  clothIndigoSh: "#33386a",

  // props
  basketBase: "#a07c45",
  basketDark: "#70552e",
  cropGreen: "#59a35b",
  cropGreenHi: "#86d176",
  cropYellow: "#e6c04a",
  fruitRed: "#d2564a",
  fruitOrange: "#ec9a41",

  // ui / misc
  outline: "#1b1410",
  ink: "#2c1e14",
  white: "#ffffff",
  black: "#000000",
  none: "transparent",
} as const;

export type PaletteKey = keyof typeof PAL;
