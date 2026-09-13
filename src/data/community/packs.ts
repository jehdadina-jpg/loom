/**
 * A CommunityPack lets state/community-specific labels and accent colors be swapped in
 * without changing any game logic. The default pack stays deliberately neutral so the
 * core experience never assumes one Northeast Indian state's culture.
 */
export interface CommunityPack {
  id: string;
  label: string;
  villageName: string;
  accent: string;
  accentSoft: string;
  greetingWord: string;
}

export const DEFAULT_PACK: CommunityPack = {
  id: "default",
  label: "Northeast Village",
  villageName: "the village",
  accent: "#c9903a",
  accentSoft: "#e8dcc0",
  greetingWord: "Hello",
};

export const COMMUNITY_PACKS: CommunityPack[] = [
  DEFAULT_PACK,
  {
    id: "nagaland",
    label: "Nagaland",
    villageName: "the village",
    accent: "#a83b3b",
    accentSoft: "#f0d9c8",
    greetingWord: "Chiba",
  },
  {
    id: "assam",
    label: "Assam",
    villageName: "the gaon",
    accent: "#2f7d78",
    accentSoft: "#dcefe0",
    greetingWord: "Nomoskar",
  },
  {
    id: "meghalaya",
    label: "Meghalaya",
    villageName: "the village",
    accent: "#3d5f8a",
    accentSoft: "#dbe6f0",
    greetingWord: "Khublei",
  },
];

export function getPack(id: string): CommunityPack {
  return COMMUNITY_PACKS.find((p) => p.id === id) ?? DEFAULT_PACK;
}
