/**
 * Loading and removing the demonstration person. Every key written here is profile-scoped
 * under the demo's own id, so it sits beside a real family's records without touching them,
 * and removing it takes exactly what it wrote back out again.
 */
import { scopedKey } from "../profiles/ProfileContext";
import { DEMO_PROFILE_ID, demoProfile, demoStores } from "./demoData";

const PROFILES_KEY = "loom_profiles_v1";

interface StoredProfile {
  id: string;
  person?: { fullName?: string };
}

interface ProfileState {
  profiles: StoredProfile[];
  activeId: string;
}

/** The stores that would hold anything a family had actually put in or played. */
const EVIDENCE_OF_USE = [
  "loom_hw_record_v1",
  "loom_telemetry_v1",
  "loom_photos_v1",
  "loom_rudas_v1",
  "loom_reminders_v1",
  "loom_appointments_v1",
  "loom_mood_v1",
  "loom_wellbeing_v1",
];

/**
 * A profile nobody has done anything with: the placeholder the app starts life with, before
 * a name is entered or a single session is played. Only ever used to decide whether the
 * placeholder can be cleared away — anything with a name or a record is left alone.
 */
function isUntouchedPlaceholder(p: StoredProfile): boolean {
  if (p.person?.fullName?.trim()) return false;
  return EVIDENCE_OF_USE.every((base) => {
    const raw = localStorage.getItem(scopedKey(base, p.id));
    if (raw === null) return true;
    try {
      const value = JSON.parse(raw) as unknown;
      return Array.isArray(value) ? value.length === 0 : !value;
    } catch {
      return false;
    }
  });
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

/**
 * Writes the demonstration person and switches to them. The page is reloaded by the caller.
 *
 * The empty placeholder profile the app starts with is cleared away at the same time, so a
 * device set aside for showing LOOM holds one person rather than two and there is nothing to
 * pick between. A profile with a name on it, or any record behind it, is never touched.
 */
export function installDemo(now = Date.now()): void {
  const stores = demoStores(now);
  for (const [base, value] of Object.entries(stores)) {
    localStorage.setItem(scopedKey(base, DEMO_PROFILE_ID), JSON.stringify(value));
  }
  const state = readProfiles();
  const kept = state.profiles.filter((p) => p.id !== DEMO_PROFILE_ID && !isUntouchedPlaceholder(p));
  for (const dropped of state.profiles.filter((p) => p.id !== DEMO_PROFILE_ID && !kept.includes(p))) {
    for (const key of Object.keys(localStorage)) {
      if (key.endsWith(`__${dropped.id}`)) localStorage.removeItem(key);
    }
  }
  localStorage.setItem(PROFILES_KEY, JSON.stringify({ profiles: [...kept, demoProfile(now)], activeId: DEMO_PROFILE_ID }));
}

/**
 * Sets the demonstration person up from the address bar, so a browser that has never seen
 * LOOM can be put straight into it without walking through Setup first. Already installed
 * means leave it exactly as it is — a reload during a recording must not regenerate it.
 */
export function installDemoFromUrl(): boolean {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("demo")) return false;
  const fresh = !demoInstalled();
  if (fresh) installDemo();
  url.searchParams.delete("demo");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  return fresh;
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
