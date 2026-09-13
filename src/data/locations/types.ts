import type { TileGrid, TileKind } from "../../engine/tilemap";
import type { WorldObject } from "../../engine/world";
import type { CommunityPack } from "../community/packs";
import type { LightSource } from "../../engine/fx/Lighting";
import type { Emitter, ParticleKind } from "../../engine/fx/Particles";

/**
 * A small hidden delight. Tapping a sleeping dog, a cooking pot or a temple bell
 * does nothing useful — it just does something lovely. There are no points for
 * finding them and nothing is lost by never looking.
 */
export interface EasterEgg {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** One warm line shown when it's found. */
  line: string;
  burst?: ParticleKind;
  burstCount?: number;
  sound?: "chirp" | "confirm" | "tap";
}

export type LocationId =
  | "home"
  | "market"
  | "veranda"
  | "waterpoint"
  | "field"
  | "path"
  | "community"
  | "garden";

/** What a tap will do — drives the always-visible label so nothing is a mystery box. */
export type HotspotKind = "place" | "person" | "activity" | "rest";

export interface Hotspot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Short name shown on the in-world plaque, e.g. "Market". */
  label: string;
  /** One line telling the player what's there before they tap, e.g. "Ilo's vegetable stalls". */
  description: string;
  kind: HotspotKind;
  action: HotspotAction;
}

export type HotspotAction =
  | { type: "navigate"; to: LocationId }
  | { type: "activity"; activityId: string }
  /** Resolved at build time to whichever activity the pool is currently offering. */
  | { type: "activityPool"; poolId: string }
  | { type: "dialogue"; npcId: string; line?: string }
  | { type: "comfort" };

export interface LocationScene {
  id: LocationId;
  name: string;
  /** Shown on the arrival banner so the player always knows where they just landed. */
  subtitle: string;
  horizonRatio: number;
  terraces: boolean;
  groundKind: TileKind;
  tileGrid: TileGrid;
  objects: (time: number) => WorldObject[];
  hotspots: Hotspot[];
  /** Where the always-present "go back" control returns to. Omitted on the village hub. */
  backTo?: LocationId;
  ambientNote?: string;
  /** Ambient soundscape key for this place. */
  ambience?: "village" | "water" | "market" | "field" | "indoor";
  /** Rest places never carry a suggestion — nothing here should feel like a task. */
  noGuide?: boolean;
  /** Warm light pools that switch on as the day fades — windows, lanterns, the hearth. */
  lights?: LightSource[];
  /** Scene-specific particle emitters: chimney smoke, fireflies, blossom, dust. */
  emitters?: Emitter[];
  /** Water surface, used for reflections and rain ripples. */
  waterRect?: { x: number; y: number; w: number; h: number };
  /** Fixed phase for places that should always read a certain way (0.76 = golden hour). */
  fixedPhase?: number;
  /** Unlabelled hidden delights — see EasterEgg. */
  easterEggs?: EasterEgg[];
}

export type LocationBuilder = (pack: CommunityPack, seed: number) => LocationScene;
