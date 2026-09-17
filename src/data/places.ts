import type { LocationId } from "./locations/types";

export const PLACE_NAMES: Record<LocationId, string> = {
  home: "Home",
  veranda: "Veranda",
  market: "Market",
  garden: "Garden",
  field: "Fields",
  community: "Gathering circle",
  path: "Village road",
  waterpoint: "Water point",
};

export const PLACE_ORDER: LocationId[] = ["home", "veranda", "market", "garden", "field", "community", "path", "waterpoint"];
