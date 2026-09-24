/**
 * Loading and removing the demonstration person. Every key written here is profile-scoped
 * under the demo's own id, so it sits beside a real family's records without touching them,
 * and removing it takes exactly what it wrote back out again.
 */
import { scopedKey } from "../profiles/ProfileContext";
import { DEMO_PROFILE_ID, demoProfile, demoStores } from "./demoData";

const PROFILES_KEY = "loom_profiles_v1";

interface ProfileState {
  profiles: { id: string }[];
  activeId: string;
}

function readProfiles(): ProfileState {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    const parsed = raw ? (JSON.parse(raw) as ProfileState) : null;
    if (parsed?.profiles?.length) return parsed;
  } catch {
    // fall through — the provider's own default will stand
  }
  return { profiles: [], activeId: "" };
}

export function demoInstalled(): boolean {
  return readProfiles().profiles.some((p) => p.id === DEMO_PROFILE_ID);
}

/** Writes the demonstration person and switches to them. The page is reloaded by the caller. */
export function installDemo(now = Date.now()): void {
  const stores = demoStores(now);
  for (const [base, value] of Object.entries(stores)) {
    localStorage.setItem(scopedKey(base, DEMO_PROFILE_ID), JSON.stringify(value));
  }
  const state = readProfiles();
  const profiles = [...state.profiles.filter((p) => p.id !== DEMO_PROFILE_ID), demoProfile(now)];
  localStorage.setItem(PROFILES_KEY, JSON.stringify({ profiles, activeId: DEMO_PROFILE_ID }));
}

export function removeDemo(): void {
  for (const base of Object.keys(demoStores(Date.now()))) {
    localStorage.removeItem(scopedKey(base, DEMO_PROFILE_ID));
  }
  // anything else the demo's own use of the app left behind under its id
  for (const key of Object.keys(localStorage)) {
    if (key.endsWith(`__${DEMO_PROFILE_ID}`)) localStorage.removeItem(key);
  }
  const state = readProfiles();
  const profiles = state.profiles.filter((p) => p.id !== DEMO_PROFILE_ID);
  if (!profiles.length) {
    localStorage.removeItem(PROFILES_KEY);
    return;
  }
  const activeId = state.activeId === DEMO_PROFILE_ID ? profiles[0].id : state.activeId;
  localStorage.setItem(PROFILES_KEY, JSON.stringify({ profiles, activeId }));
}
