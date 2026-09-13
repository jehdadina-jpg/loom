import {
  basketSprite,
  cropRowSprite,
  cupSprite,
  fruitSprite,
  kettleSprite,
  leafBundleSprite,
  toolSprite,
  potSprite,
  crateSprite,
  firewoodSprite,
  stoolSprite,
  benchSprite,
  clothSwatch,
  riceBowlSprite,
  fishSprite,
  lampSprite,
  broomSprite,
} from "../engine/sprites/props";
import { chickenSprite, dogSprite, goatSprite } from "../engine/sprites/animals";
import { villagerSprite, VILLAGER_PALETTES } from "../engine/sprites/characters";
import { flowerClumpSprite, rockSprite, bushSprite, reedSprite } from "../engine/sprites/nature";
import { getNPC } from "./npcs";

export type CognitiveDomain = "memory" | "attention" | "speed" | "language" | "visuospatial";

export interface ActivityOption {
  id: string;
  label: string;
  render: () => HTMLCanvasElement;
  correct?: boolean;
}

export interface ActivityDef {
  id: string;
  domain: CognitiveDomain;
  /**
   * identify — choose the one that matches the prompt
   * sequence — tap things in the right order
   * pairs    — turn over cards to find matching pairs
   * count    — how many of these are there?
   */
  kind: "identify" | "sequence" | "pairs" | "count";
  title: string;
  prompt: string;
  successLine: string;
  /** Warm, non-evaluative line saved to the family album when this is completed. */
  memoryNote: string;
  options?: ActivityOption[];
  steps?: ActivityOption[];
  pairs?: ActivityOption[];
  count?: { icon: () => HTMLCanvasElement; answer: number; choices: number[] };
}

function npcPortrait(npcId: string) {
  const npc = getNPC(npcId);
  const pal = VILLAGER_PALETTES[npc.paletteId] ?? VILLAGER_PALETTES.bimal;
  return () => villagerSprite({ id: npc.id, shape: npc.shape, hairStyle: npc.hairStyle, frame: 0, pal });
}

const opt = (id: string, label: string, render: () => HTMLCanvasElement, correct = false): ActivityOption => ({
  id,
  label,
  render,
  correct,
});

export const ACTIVITIES: ActivityDef[] = [
  // ============================================================ HOME
  {
    id: "hearth-sequence",
    domain: "attention",
    kind: "sequence",
    title: "Making Tea",
    prompt: "Tap each step in order, the way tea is always made.",
    successLine: "Lovely — the tea is ready, just like always.",
    memoryNote: "Made tea at the hearth, the way it has always been made.",
    steps: [
      opt("water", "Fetch Water", () => toolSprite("bucket")),
      opt("boil", "Boil It", () => kettleSprite()),
      opt("leaves", "Add Leaves", () => leafBundleSprite()),
      opt("pour", "Pour & Serve", () => cupSprite()),
    ],
  },
  {
    id: "home-firewood",
    domain: "visuospatial",
    kind: "identify",
    title: "Building the Fire",
    prompt: "Which one do we put on the fire?",
    successLine: "That's it — dry wood burns best.",
    memoryNote: "Chose the firewood for the evening fire.",
    options: [
      opt("wood", "Firewood", () => firewoodSprite(), true),
      opt("cloth", "Cloth", () => clothSwatch("red")),
      opt("rice", "Rice bowl", () => riceBowlSprite()),
      opt("flower", "Flowers", () => flowerClumpSprite(1)),
    ],
  },
  {
    id: "home-count-cups",
    domain: "speed",
    kind: "count",
    title: "Cups on the Tray",
    prompt: "How many cups are set out?",
    successLine: "Just right. Enough for everyone.",
    memoryNote: "Counted out the cups for the family.",
    count: { icon: () => cupSprite(), answer: 4, choices: [2, 3, 4, 5] },
  },
  {
    id: "home-pairs-kitchen",
    domain: "memory",
    kind: "pairs",
    title: "Things in the Kitchen",
    prompt: "Turn the cards over and find the matching pairs.",
    successLine: "All found. Everything back in its place.",
    memoryNote: "Matched up the things that live in the kitchen.",
    pairs: [
      opt("kettle", "Kettle", () => kettleSprite()),
      opt("cup", "Cup", () => cupSprite()),
      opt("pot", "Pot", () => potSprite(0)),
      opt("rice", "Rice bowl", () => riceBowlSprite()),
    ],
  },
  {
    id: "home-evening-order",
    domain: "attention",
    kind: "sequence",
    title: "Settling for the Evening",
    prompt: "Tap each thing in the order it happens.",
    successLine: "A good evening, done in good order.",
    memoryNote: "Set the house right for the evening.",
    steps: [
      opt("sweep", "Sweep the floor", () => broomSprite()),
      opt("fire", "Build the fire", () => firewoodSprite()),
      opt("cook", "Cook the rice", () => potSprite(1)),
      opt("lamp", "Light the lamp", () => lampSprite()),
    ],
  },
  {
    id: "home-odd-one",
    domain: "language",
    kind: "identify",
    title: "Not From This Room",
    prompt: "Which one does not belong in the kitchen?",
    successLine: "Quite right — that belongs outside.",
    memoryNote: "Sorted out what belongs in the kitchen.",
    options: [
      opt("hoe", "A hoe", () => toolSprite("hoe"), true),
      opt("pot", "A pot", () => potSprite(0)),
      opt("cup", "A cup", () => cupSprite()),
      opt("rice", "A rice bowl", () => riceBowlSprite()),
    ],
  },

  // ============================================================ MARKET
  {
    id: "market-identify",
    domain: "visuospatial",
    kind: "identify",
    title: "Find the Basket",
    prompt: "Which one is the basket?",
    successLine: "That's it — the woven basket.",
    memoryNote: "Picked out the woven basket at the market.",
    options: [
      opt("basket", "Basket", () => basketSprite(0), true),
      opt("kettle", "Kettle", () => kettleSprite()),
      opt("cup", "Cup", () => cupSprite()),
      opt("tool", "Hoe", () => toolSprite("hoe")),
    ],
  },
  {
    id: "market-match",
    domain: "language",
    kind: "identify",
    title: "Match the Fruit",
    prompt: "Tap the orange fruit.",
    successLine: "Just right — a ripe orange.",
    memoryNote: "Helped Ilo choose fruit at the stall.",
    options: [
      opt("red", "Red fruit", () => fruitSprite("red")),
      opt("orange", "Orange fruit", () => fruitSprite("orange"), true),
      opt("yellow", "Yellow fruit", () => fruitSprite("yellow")),
      opt("green", "Green fruit", () => fruitSprite("green")),
    ],
  },
  {
    id: "market-count-fruit",
    domain: "speed",
    kind: "count",
    title: "Counting the Oranges",
    prompt: "How many oranges are on the counter?",
    successLine: "Exactly right. Ilo would be impressed.",
    memoryNote: "Counted the oranges on Ilo's counter.",
    count: { icon: () => fruitSprite("orange"), answer: 5, choices: [3, 4, 5, 6] },
  },
  {
    id: "market-pairs-goods",
    domain: "memory",
    kind: "pairs",
    title: "What's on the Stalls",
    prompt: "Find the pairs of things sold at the market.",
    successLine: "Every pair found. The stall is in order.",
    memoryNote: "Matched the goods on the market stalls.",
    pairs: [
      opt("orange", "Orange", () => fruitSprite("orange")),
      opt("green", "Greens", () => fruitSprite("green")),
      opt("basket", "Basket", () => basketSprite(1)),
      opt("cloth", "Cloth", () => clothSwatch("indigo")),
    ],
  },
  {
    id: "market-cloth-colour",
    domain: "language",
    kind: "identify",
    title: "Choosing Cloth",
    prompt: "Tap the deep red cloth.",
    successLine: "A good choice. That colour wears well.",
    memoryNote: "Chose a cloth from the market stall.",
    options: [
      opt("red", "Red cloth", () => clothSwatch("red"), true),
      opt("teal", "Teal cloth", () => clothSwatch("teal")),
      opt("indigo", "Indigo cloth", () => clothSwatch("indigo")),
      opt("mustard", "Mustard cloth", () => clothSwatch("mustard")),
    ],
  },
  {
    id: "market-errand",
    domain: "attention",
    kind: "sequence",
    title: "The Market Errand",
    prompt: "Tap each errand in the order you'd do it.",
    successLine: "Everything gathered, nothing forgotten.",
    memoryNote: "Ran the market errand from start to finish.",
    steps: [
      opt("basket", "Take the basket", () => basketSprite(2)),
      opt("fruit", "Choose the fruit", () => fruitSprite("orange")),
      opt("rice", "Collect the rice", () => riceBowlSprite()),
      opt("home", "Carry it home", () => crateSprite()),
    ],
  },

  // ============================================================ VERANDA
  {
    id: "veranda-faces",
    domain: "memory",
    kind: "identify",
    title: "Who Is This?",
    prompt: "Which one is Bimal?",
    successLine: "Yes — that's Bimal.",
    memoryNote: "Sat on the veranda and named the family.",
    options: [
      opt("ramal", "Ramal", npcPortrait("ramal")),
      opt("bimal", "Bimal", npcPortrait("bimal"), true),
      opt("deeplia", "Deeplia", npcPortrait("deeplia")),
      opt("naren", "Naren", npcPortrait("naren")),
    ],
  },
  {
    id: "veranda-faces-deeplia",
    domain: "memory",
    kind: "identify",
    title: "Who Is This?",
    prompt: "Which one is Deeplia?",
    successLine: "That's her — Deeplia.",
    memoryNote: "Named the family sitting on the veranda.",
    options: [
      opt("rumak", "Rumak", npcPortrait("rumak")),
      opt("deeplia", "Deeplia", npcPortrait("deeplia"), true),
      opt("vendor", "Ilo", npcPortrait("vendor")),
      opt("bimal", "Bimal", npcPortrait("bimal")),
    ],
  },
  {
    id: "veranda-pairs-family",
    domain: "memory",
    kind: "pairs",
    title: "Everyone on the Veranda",
    prompt: "Turn over the cards and find each person twice.",
    successLine: "Everyone found. The whole family is here.",
    memoryNote: "Found everyone sitting out on the veranda.",
    pairs: [
      opt("ramal", "Ramal", npcPortrait("ramal")),
      opt("bimal", "Bimal", npcPortrait("bimal")),
      opt("deeplia", "Deeplia", npcPortrait("deeplia")),
      opt("rumak", "Rumak", npcPortrait("rumak")),
    ],
  },
  {
    id: "veranda-count-people",
    domain: "speed",
    kind: "count",
    title: "Who Came Out Tonight",
    prompt: "How many people are sitting with you?",
    successLine: "That's everyone, counted right.",
    memoryNote: "Counted the family out on the veranda.",
    count: { icon: npcPortrait("naren"), answer: 3, choices: [2, 3, 4, 5] },
  },
  {
    id: "veranda-weaving",
    domain: "visuospatial",
    kind: "sequence",
    title: "At the Loom",
    prompt: "Tap the colours in the order they go into the cloth.",
    successLine: "A good pattern. Steady hands.",
    memoryNote: "Worked a pattern at the loom on the veranda.",
    steps: [
      opt("cream", "Cream first", () => clothSwatch("cream")),
      opt("red", "Then red", () => clothSwatch("red")),
      opt("indigo", "Then indigo", () => clothSwatch("indigo")),
      opt("mustard", "Mustard last", () => clothSwatch("mustard")),
    ],
  },
  {
    id: "veranda-evening-sound",
    domain: "language",
    kind: "identify",
    title: "Evening on the Veranda",
    prompt: "Which one gets lit when the sun goes down?",
    successLine: "The lamp it is. Warm light for the evening.",
    memoryNote: "Lit the lamp as the evening came in.",
    options: [
      opt("lamp", "The lamp", () => lampSprite(), true),
      opt("stool", "The stool", () => stoolSprite()),
      opt("cloth", "The cloth", () => clothSwatch("teal")),
      opt("bench", "The bench", () => benchSprite()),
    ],
  },

  // ============================================================ FIELD
  {
    id: "field-harvest",
    domain: "visuospatial",
    kind: "identify",
    title: "Ready to Harvest",
    prompt: "Tap the crop row that's ready to pick.",
    successLine: "Good eye — that row is ready.",
    memoryNote: "Spotted the row that was ready to pick.",
    options: [
      opt("young", "Just planted", () => cropRowSprite(0, 0)),
      opt("growing", "Growing", () => cropRowSprite(1, 0)),
      opt("ripe", "Ripe", () => cropRowSprite(2, 0), true),
    ],
  },
  {
    id: "field-route",
    domain: "attention",
    kind: "sequence",
    title: "Follow the Row",
    prompt: "Walk the field the way you always have — tap the steps in order.",
    successLine: "You know this field well.",
    memoryNote: "Walked the field row, the familiar way.",
    steps: [
      opt("start", "Start of Row", () => cropRowSprite(2, 0)),
      opt("middle", "Middle", () => cropRowSprite(1, 1)),
      opt("end", "End of Row", () => cropRowSprite(0, 1)),
    ],
  },
  {
    id: "field-growth-order",
    domain: "visuospatial",
    kind: "sequence",
    title: "How Things Grow",
    prompt: "Tap them in order, from newly planted to ready.",
    successLine: "That's the whole season, in order.",
    memoryNote: "Put the growing season in its right order.",
    steps: [
      opt("seed", "Just planted", () => cropRowSprite(0, 0)),
      opt("grow", "Growing", () => cropRowSprite(1, 0)),
      opt("ripe", "Ready", () => cropRowSprite(2, 1)),
    ],
  },
  {
    id: "field-tools",
    domain: "language",
    kind: "identify",
    title: "The Right Tool",
    prompt: "Which one do we use to break up the soil?",
    successLine: "The hoe. It's been used on this hillside for years.",
    memoryNote: "Picked the right tool for the field.",
    options: [
      opt("hoe", "Hoe", () => toolSprite("hoe"), true),
      opt("broom", "Broom", () => broomSprite()),
      opt("lamp", "Lamp", () => lampSprite()),
      opt("cup", "Cup", () => cupSprite()),
    ],
  },
  {
    id: "field-count-baskets",
    domain: "speed",
    kind: "count",
    title: "Baskets Filled",
    prompt: "How many baskets have been filled today?",
    successLine: "A good day's work, counted right.",
    memoryNote: "Counted the day's filled baskets.",
    count: { icon: () => basketSprite(0), answer: 3, choices: [2, 3, 4, 5] },
  },
  {
    id: "field-pairs-crops",
    domain: "memory",
    kind: "pairs",
    title: "What Grows Here",
    prompt: "Find the matching pairs from the terraces.",
    successLine: "All matched. The whole terrace accounted for.",
    memoryNote: "Matched what grows on the terraces.",
    pairs: [
      opt("ripe", "Ripe row", () => cropRowSprite(2, 0)),
      opt("young", "New row", () => cropRowSprite(0, 0)),
      opt("basket", "Basket", () => basketSprite(3)),
      opt("hoe", "Hoe", () => toolSprite("hoe")),
    ],
  },

  // ============================================================ GARDEN
  {
    id: "garden-water",
    domain: "speed",
    kind: "sequence",
    title: "Tend the Garden",
    prompt: "Water each row, one after another.",
    successLine: "The garden looks well cared for.",
    memoryNote: "Watered the garden rows, one after another.",
    steps: [
      opt("row1", "First Row", () => cropRowSprite(1, 0)),
      opt("row2", "Second Row", () => cropRowSprite(1, 1)),
      opt("row3", "Third Row", () => cropRowSprite(2, 0)),
    ],
  },
  {
    id: "garden-flowers",
    domain: "language",
    kind: "identify",
    title: "Picking Flowers",
    prompt: "Tap the flowers Rumak would pick.",
    successLine: "She'd choose those too.",
    memoryNote: "Picked flowers in the garden.",
    options: [
      opt("flower", "Flowers", () => flowerClumpSprite(1), true),
      opt("rock", "A stone", () => rockSprite(0)),
      opt("bush", "A bush", () => bushSprite(1)),
      opt("reed", "Reeds", () => reedSprite(0)),
    ],
  },
  {
    id: "garden-count-hens",
    domain: "speed",
    kind: "count",
    title: "Hens in the Garden",
    prompt: "How many hens have got in among the vegetables?",
    successLine: "That's all of them. Time to shoo them out.",
    memoryNote: "Counted the hens loose in the garden.",
    count: { icon: () => chickenSprite(0), answer: 2, choices: [1, 2, 3, 4] },
  },
  {
    id: "garden-pairs-plants",
    domain: "memory",
    kind: "pairs",
    title: "In the Beds",
    prompt: "Find the pairs growing in the garden.",
    successLine: "All matched. The beds are in order.",
    memoryNote: "Matched up what's growing in the garden beds.",
    pairs: [
      opt("flower", "Flowers", () => flowerClumpSprite(2)),
      opt("crop", "Vegetables", () => cropRowSprite(1, 0)),
      opt("bush", "Bush", () => bushSprite(0)),
      opt("bucket", "Watering can", () => toolSprite("bucket")),
    ],
  },
  {
    id: "garden-planting",
    domain: "attention",
    kind: "sequence",
    title: "Planting a Row",
    prompt: "Tap each step of planting, in order.",
    successLine: "Planted properly. It'll come up well.",
    memoryNote: "Planted a fresh row in the garden.",
    steps: [
      opt("dig", "Break the soil", () => toolSprite("hoe")),
      opt("seed", "Set the seed", () => cropRowSprite(0, 0)),
      opt("water", "Water it in", () => toolSprite("bucket")),
      opt("grow", "Let it grow", () => cropRowSprite(1, 1)),
    ],
  },
  {
    id: "garden-odd-one",
    domain: "visuospatial",
    kind: "identify",
    title: "Doesn't Grow Here",
    prompt: "Which of these does not grow in a garden?",
    successLine: "Quite right — that one came from the house.",
    memoryNote: "Sorted out what grows in a garden.",
    options: [
      opt("kettle", "A kettle", () => kettleSprite(), true),
      opt("flower", "Flowers", () => flowerClumpSprite(0)),
      opt("crop", "Vegetables", () => cropRowSprite(2, 0)),
      opt("bush", "A bush", () => bushSprite(2)),
    ],
  },

  // ============================================================ COMMUNITY
  {
    id: "community-song",
    domain: "language",
    kind: "identify",
    title: "Join the Circle",
    prompt: "Which friend shall we sit with first?",
    successLine: "Wonderful — everyone is glad you're here.",
    memoryNote: "Joined the circle with the neighbours.",
    options: [
      opt("ramal", "Ramal", npcPortrait("ramal"), true),
      opt("naren", "Naren", npcPortrait("naren")),
      opt("deeplia", "Deeplia", npcPortrait("deeplia")),
    ],
  },
  {
    id: "community-pairs-neighbours",
    domain: "memory",
    kind: "pairs",
    title: "Faces in the Circle",
    prompt: "Find each neighbour twice.",
    successLine: "Everyone accounted for.",
    memoryNote: "Found every neighbour in the circle.",
    pairs: [
      opt("ramal", "Ramal", npcPortrait("ramal")),
      opt("deeplia", "Deeplia", npcPortrait("deeplia")),
      opt("vendor", "Ilo", npcPortrait("vendor")),
      opt("naren", "Naren", npcPortrait("naren")),
    ],
  },
  {
    id: "community-count-benches",
    domain: "speed",
    kind: "count",
    title: "Seats in the Circle",
    prompt: "How many benches are set out?",
    successLine: "Just enough for everyone who came.",
    memoryNote: "Counted the seats set out for the gathering.",
    count: { icon: () => stoolSprite(), answer: 4, choices: [3, 4, 5, 6] },
  },
  {
    id: "community-fire",
    domain: "attention",
    kind: "sequence",
    title: "Lighting the Fire Pit",
    prompt: "Tap each step in order to get the fire going.",
    successLine: "It's caught. Everyone moves a little closer.",
    memoryNote: "Got the fire going for the gathering.",
    steps: [
      opt("wood", "Stack the wood", () => firewoodSprite()),
      opt("light", "Light it", () => lampSprite()),
      opt("pot", "Set the pot on", () => potSprite(1)),
      opt("share", "Share it round", () => riceBowlSprite()),
    ],
  },
  {
    id: "community-festival",
    domain: "language",
    kind: "identify",
    title: "Getting Ready",
    prompt: "Which one do we hang up for the festival?",
    successLine: "Cloth it is. The whole road will be bright.",
    memoryNote: "Helped get ready for the village festival.",
    options: [
      opt("cloth", "Bright cloth", () => clothSwatch("mustard"), true),
      opt("hoe", "A hoe", () => toolSprite("hoe")),
      opt("crate", "A crate", () => crateSprite()),
      opt("rock", "A stone", () => rockSprite(1)),
    ],
  },
  {
    id: "community-animals",
    domain: "visuospatial",
    kind: "identify",
    title: "Whose Dog Is That?",
    prompt: "Tap the dog.",
    successLine: "That's him — always where the food is.",
    memoryNote: "Spotted the village dog at the gathering.",
    options: [
      opt("dog", "The dog", () => dogSprite(0), true),
      opt("goat", "The goat", () => goatSprite(0)),
      opt("hen", "The hen", () => chickenSprite(0)),
      opt("fish", "A fish", () => fishSprite()),
    ],
  },

  // ============================================================ WATER POINT (gentle only)
  {
    id: "water-pairs-quiet",
    domain: "memory",
    kind: "pairs",
    title: "Down by the Water",
    prompt: "Find the pairs. There's no hurry at all.",
    successLine: "All found. The water hasn't moved an inch.",
    memoryNote: "Matched the quiet things down by the water.",
    pairs: [
      opt("fish", "Fish", () => fishSprite()),
      opt("reed", "Reeds", () => reedSprite(1)),
      opt("rock", "Stone", () => rockSprite(0)),
    ],
  },
  {
    id: "water-count-fish",
    domain: "speed",
    kind: "count",
    title: "Fish in the Shallows",
    prompt: "How many fish can you see?",
    successLine: "That's them all. They'll be gone in a moment.",
    memoryNote: "Watched and counted the fish in the shallows.",
    count: { icon: () => fishSprite(), answer: 3, choices: [2, 3, 4] },
  },

  // ============================================================ VILLAGE PATH
  {
    id: "path-animals",
    domain: "language",
    kind: "identify",
    title: "Along the Road",
    prompt: "Tap the goat.",
    successLine: "That's the one. Always up on the terraces.",
    memoryNote: "Spotted the animals along the village road.",
    options: [
      opt("goat", "Goat", () => goatSprite(0), true),
      opt("dog", "Dog", () => dogSprite(0)),
      opt("hen", "Hen", () => chickenSprite(0)),
      opt("fish", "Fish", () => fishSprite()),
    ],
  },
  {
    id: "path-count-hens",
    domain: "speed",
    kind: "count",
    title: "Hens on the Road",
    prompt: "How many hens are out on the road?",
    successLine: "Counted right. They'll wander off now.",
    memoryNote: "Counted the hens out on the village road.",
    count: { icon: () => chickenSprite(0), answer: 4, choices: [2, 3, 4, 5] },
  },
  {
    id: "path-pairs-village",
    domain: "memory",
    kind: "pairs",
    title: "Around the Village",
    prompt: "Find the pairs of things you'd see along the road.",
    successLine: "Every one found.",
    memoryNote: "Matched the familiar things along the road.",
    pairs: [
      opt("basket", "Basket", () => basketSprite(0)),
      opt("hen", "Hen", () => chickenSprite(0)),
      opt("dog", "Dog", () => dogSprite(0)),
      opt("flower", "Flowers", () => flowerClumpSprite(3)),
    ],
  },
  {
    id: "path-errand-order",
    domain: "attention",
    kind: "sequence",
    title: "A Walk Down the Road",
    prompt: "Tap each place in the order you'd pass it.",
    successLine: "That's the way. You could walk it with your eyes shut.",
    memoryNote: "Walked the road past every familiar place.",
    steps: [
      opt("home", "Leave home", () => lampSprite()),
      opt("well", "Pass the well", () => toolSprite("bucket")),
      opt("market", "Reach the market", () => basketSprite(1)),
      opt("back", "Carry it home", () => crateSprite()),
    ],
  },
];

export function getActivity(id: string): ActivityDef | undefined {
  return ACTIVITIES.find((a) => a.id === id);
}

/**
 * Each activity plaque in the world draws from a pool rather than being fixed, so a
 * place has plenty to offer without ever showing more than a few choices at once.
 * The plaque always names the activity currently waiting behind it.
 */
export const ACTIVITY_POOLS: Record<string, string[]> = {
  "home-hearth": ["hearth-sequence", "home-evening-order", "home-count-cups", "home-firewood"],
  "home-things": ["home-pairs-kitchen", "home-odd-one"],
  "market-left": ["market-identify", "market-cloth-colour", "market-pairs-goods"],
  "market-right": ["market-match", "market-count-fruit", "market-errand"],
  "veranda-faces": ["veranda-faces", "veranda-faces-deeplia", "veranda-pairs-family", "veranda-count-people"],
  "veranda-craft": ["veranda-weaving", "veranda-evening-sound"],
  "field-left": ["field-harvest", "field-growth-order", "field-count-baskets"],
  "field-right": ["field-route", "field-tools", "field-pairs-crops"],
  "garden-rows": ["garden-water", "garden-planting", "garden-count-hens"],
  "garden-beds": ["garden-flowers", "garden-pairs-plants", "garden-odd-one"],
  "community-circle": ["community-song", "community-pairs-neighbours", "community-count-benches"],
  "community-fire": ["community-fire", "community-festival", "community-animals"],
  "path-road": ["path-animals", "path-count-hens", "path-pairs-village", "path-errand-order"],
  "water-quiet": ["water-pairs-quiet", "water-count-fish"],
};

/** Resolves which activity a pool is offering right now. */
export function activityFromPool(poolId: string, rotation: number): ActivityDef | undefined {
  const pool = ACTIVITY_POOLS[poolId];
  if (!pool?.length) return undefined;
  return getActivity(pool[Math.abs(rotation) % pool.length]);
}
