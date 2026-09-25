import type { EasterEgg } from "./types";

/**
 * Hidden delights scattered through the village.
 *
 * None of them are tasks. Nothing is scored, nothing is missed by ignoring them,
 * and none of them are ever hinted at — they exist so that idle, curious tapping
 * is rewarded with warmth instead of nothing. For someone who may tap the screen
 * simply to see what happens, that matters.
 */
export const EASTER_EGGS: Record<string, EasterEgg[]> = {
  path: [
    { id: "egg-dog-nap", x: 104, y: 234, w: 34, h: 26, line: "The dog rolls over for a belly rub.", burst: "dust", burstCount: 10, sound: "chirp" },
    { id: "egg-well-echo", x: 224, y: 190, w: 30, h: 34, line: "You call down the well. The well calls back.", burst: "splash", burstCount: 12 },
    { id: "egg-chimney", x: 44, y: 140, w: 30, h: 24, line: "Someone inside is making tea. You can smell it.", burst: "smoke", burstCount: 14 },
    { id: "egg-big-tree", x: 312, y: 158, w: 40, h: 40, line: "A shower of leaves, and a startled bird.", burst: "leaf", burstCount: 16, sound: "chirp" },
    { id: "egg-signpost", x: 448, y: 128, w: 26, h: 30, line: "The old signpost creaks, then settles.", burst: "dust", burstCount: 6 },
    { id: "egg-flowers", x: 186, y: 250, w: 26, h: 22, line: "Butterflies lift off all at once.", burst: "butterfly", burstCount: 6 },
  ],
  home: [
    { id: "egg-kettle", x: 232, y: 236, w: 26, h: 26, line: "The kettle rattles its lid, pleased with itself.", burst: "smoke", burstCount: 12, sound: "confirm" },
    { id: "egg-firewood", x: 254, y: 246, w: 30, h: 22, line: "The embers flare up, warm and orange.", burst: "ember", burstCount: 16 },
    { id: "egg-hen", x: 400, y: 246, w: 34, h: 26, line: "The hen has been sitting on an egg all along.", burst: "dust", burstCount: 8, sound: "chirp" },
    { id: "egg-window", x: 198, y: 178, w: 34, h: 26, line: "The shutters swing open to let the evening in.", burst: "dust", burstCount: 6 },
    { id: "egg-pots", x: 300, y: 236, w: 44, h: 24, line: "The pots clink together like an old song.", burst: "dust", burstCount: 8, sound: "confirm" },
  ],
  market: [
    { id: "egg-fruit-pile", x: 240, y: 178, w: 44, h: 26, line: "An orange escapes and rolls under the stall.", burst: "dust", burstCount: 10 },
    { id: "egg-awning", x: 40, y: 172, w: 40, h: 20, line: "The awning snaps in the breeze.", burst: "dust", burstCount: 8 },
    { id: "egg-market-dog", x: 310, y: 250, w: 40, h: 26, line: "The dog has found something under the crates.", burst: "dust", burstCount: 10, sound: "chirp" },
    { id: "egg-crate", x: 204, y: 212, w: 28, h: 24, line: "You lift the lid. Mangoes, all the way down.", burst: "leaf", burstCount: 10 },
    { id: "egg-bell", x: 448, y: 172, w: 30, h: 24, line: "The little brass bell rings over the stalls.", burst: "dust", burstCount: 6, sound: "confirm" },
  ],
  veranda: [
    { id: "egg-rail", x: 8, y: 182, w: 40, h: 30, line: "The railing is worn smooth by years of leaning.", burst: "dust", burstCount: 6 },
    { id: "egg-view", x: 180, y: 120, w: 150, h: 50, line: "Far below, someone is walking home along the terraces.", burst: "butterfly", burstCount: 4 },
    { id: "egg-basket", x: 420, y: 244, w: 26, h: 22, line: "Half-finished weaving, left for tomorrow.", burst: "dust", burstCount: 8 },
    { id: "egg-lantern", x: 460, y: 186, w: 30, h: 26, line: "The lantern sways, and the shadows dance.", burst: "ember", burstCount: 10 },
  ],
  waterpoint: [
    { id: "egg-skim", x: 200, y: 180, w: 120, h: 50, line: "The stone skips three times before it sinks.", burst: "splash", burstCount: 18, sound: "chirp" },
    { id: "egg-reeds", x: 86, y: 222, w: 34, h: 30, line: "A frog you never saw plops into the water.", burst: "splash", burstCount: 12 },
    { id: "egg-dock", x: 178, y: 228, w: 42, h: 22, line: "The old planks creak exactly where they always did.", burst: "dust", burstCount: 6 },
    { id: "egg-fish", x: 330, y: 190, w: 60, h: 40, line: "A fish turns over, silver for a moment.", burst: "splash", burstCount: 10 },
  ],
  field: [
    { id: "egg-goat", x: 410, y: 240, w: 44, h: 28, line: "The goat looks at you. You look at the goat.", burst: "dust", burstCount: 8, sound: "chirp" },
    { id: "egg-hoe", x: 262, y: 226, w: 24, h: 24, line: "The handle fits your hand like it remembers you.", burst: "dust", burstCount: 6 },
    { id: "egg-scare", x: 230, y: 186, w: 30, h: 28, line: "Sparrows scatter from the crop rows.", burst: "leaf", burstCount: 14, sound: "chirp" },
  ],
  community: [
    { id: "egg-fire", x: 228, y: 240, w: 36, h: 26, line: "The fire pops and sends up a fountain of sparks.", burst: "ember", burstCount: 20, sound: "confirm" },
    { id: "egg-comm-tree", x: 234, y: 156, w: 46, h: 46, line: "Every leaf on the old tree seems to turn at once.", burst: "leaf", burstCount: 20 },
    { id: "egg-bench", x: 170, y: 236, w: 36, h: 20, line: "Initials, carved into the bench long ago.", burst: "dust", burstCount: 6 },
  ],
  garden: [
    { id: "egg-bucket", x: 350, y: 218, w: 24, h: 26, line: "The watering can is fuller than it looks.", burst: "splash", burstCount: 12 },
    { id: "egg-marigold", x: 196, y: 246, w: 26, h: 22, line: "Marigolds, bright enough to make you squint.", burst: "butterfly", burstCount: 8 },
    { id: "egg-garden-hen", x: 266, y: 250, w: 40, h: 26, line: "The hen has been scratching up your onions again.", burst: "dust", burstCount: 10, sound: "chirp" },
  ],
};

export const TOTAL_EASTER_EGGS = Object.values(EASTER_EGGS).reduce((n, list) => n + list.length, 0);
