import type { BodyShape, HairStyle } from "../engine/sprites/characters";

export interface NPCDef {
  id: string;
  name: string;
  role: string;
  paletteId: string;
  shape: BodyShape;
  hairStyle: HairStyle;
  greeting: string;
}

export const NPCS: NPCDef[] = [
  { id: "ramal", name: "Ramal", role: "Elder", paletteId: "ramal", shape: "elder", hairStyle: "thin", greeting: "Good to see you again." },
  { id: "bimal", name: "Bimal", role: "Son", paletteId: "bimal", shape: "adult", hairStyle: "short", greeting: "Come sit with us a while." },
  { id: "deeplia", name: "Deeplia", role: "Daughter-in-law", paletteId: "deeplia", shape: "adult", hairStyle: "bun", greeting: "We saved you a seat here." },
  { id: "rumak", name: "Rumak", role: "Grandchild", paletteId: "rumak", shape: "youth", hairStyle: "long", greeting: "I picked flowers today!" },
  { id: "naren", name: "Naren", role: "Grandchild", paletteId: "naren", shape: "youth", hairStyle: "short", greeting: "Want to see the chickens?" },
  { id: "vendor", name: "Ilo", role: "Market Vendor", paletteId: "vendor", shape: "adult", hairStyle: "cap", greeting: "Fresh from the terrace fields today." },
];

export function getNPC(id: string): NPCDef {
  return NPCS.find((n) => n.id === id) ?? NPCS[0];
}
