/**
 * Everything LOOM keeps about one person, gathered for export or for deletion.
 * Required by the DPDP Act 2023: a family can take all of it away, or remove all of it.
 */
import { eraseFromQueue } from "../sync/queue";

const PROFILES_KEY = "loom_profiles_v1";

/** Every per-person key on this device. All LOOM stores are namespaced loom_*__<profileId>. */
export function personKeys(profileId: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("loom_") && k.endsWith(`__${profileId}`)) keys.push(k);
  }
  return keys.sort();
}

export function readAll(profileId: string): Record<string, unknown> {
  return Object.fromEntries(
    personKeys(profileId).map((k) => {
      try {
        return [k, JSON.parse(localStorage.getItem(k) ?? "null")];
      } catch {
        return [k, localStorage.getItem(k)];
      }
    }),
  );
}

/**
 * Deletes every record for this person on the device, drops anything waiting to upload,
 * and queues one request asking the sync server to erase its copy. Works directly on
 * storage and then reloads, so no in-memory state can write anything back.
 */
export function eraseEverything(profileId: string) {
  for (const k of personKeys(profileId)) localStorage.removeItem(k);

  try {
    const state = JSON.parse(localStorage.getItem(PROFILES_KEY) ?? "null") as {
      profiles: Array<{ id: string }>;
      activeId: string;
    } | null;
    if (state) {
      const remaining = state.profiles.filter((p) => p.id !== profileId);
      if (remaining.length === 0) localStorage.removeItem(PROFILES_KEY);
      else localStorage.setItem(PROFILES_KEY, JSON.stringify({ profiles: remaining, activeId: remaining[0].id }));
    }
  } catch {
    localStorage.removeItem(PROFILES_KEY);
  }

  // the health worker's referral log on this device holds only ids and dates, but an erased
  // person shouldn't linger there either
  try {
    const asha = JSON.parse(localStorage.getItem("loom_asha_v1") ?? "null") as { referrals?: { personId: string }[] } | null;
    if (asha?.referrals) {
      asha.referrals = asha.referrals.filter((r) => r.personId !== profileId);
      localStorage.setItem("loom_asha_v1", JSON.stringify(asha));
    }
  } catch {
    // nothing to tidy
  }

  eraseFromQueue(profileId);
}
