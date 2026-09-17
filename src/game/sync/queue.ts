import { appendRecordEvent, assertHealthWorkerSafe, type HealthWorkerEvent } from "../../health-worker/boundary";

/**
 * Outbox for the health-worker channel. Only boundary-safe records are ever queued —
 * nothing from the Memory Vault, no session content, no names beyond the person's own.
 *
 * Changes queue up while offline and upload when a connection returns. Deleting a person
 * removes their queued items and leaves a single erase request in their place, so the
 * server copy is removed too.
 */
const QUEUE_KEY = "loom_sync_queue_v1";
const META_KEY = "loom_sync_meta_v1";
const MAX_QUEUE = 5000;
const BATCH = 50;
export const SYNC_CHANGED = "loom-sync-changed";

export const SYNC_ENDPOINT: string = import.meta.env.VITE_SYNC_URL ?? "/api/sync";

export type SyncItem =
  | { id: string; profileId: string; type: "record"; event: HealthWorkerEvent; createdAt: number }
  | { id: string; profileId: string; type: "erase"; createdAt: number };

export interface SyncMeta {
  lastSuccessAt: number | null;
  lastProblem: string | null;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // out of space: the item stays unqueued rather than breaking the app
  }
  window.dispatchEvent(new Event(SYNC_CHANGED));
}

const newId = () => `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function readQueue(): SyncItem[] {
  return read<SyncItem[]>(QUEUE_KEY, []);
}

export function readMeta(): SyncMeta {
  return read<SyncMeta>(META_KEY, { lastSuccessAt: null, lastProblem: null });
}

/** Records the event for this person on the device and queues it for upload. */
export function recordForHealthWorker(profileId: string, event: HealthWorkerEvent) {
  if (!appendRecordEvent(localStorage, profileId, event)) return;
  const queue = readQueue();
  queue.push({ id: newId(), profileId, type: "record", event, createdAt: Date.now() });
  write(QUEUE_KEY, queue.slice(-MAX_QUEUE));
}

/** Removes everything queued for a person and asks the server to erase what it holds. */
export function eraseFromQueue(profileId: string) {
  const queue = readQueue().filter((i) => i.profileId !== profileId);
  queue.push({ id: newId(), profileId, type: "erase", createdAt: Date.now() });
  write(QUEUE_KEY, queue);
}

let flushing = false;

export async function flushQueue(): Promise<void> {
  if (flushing || !navigator.onLine) return;
  const queue = readQueue();
  if (queue.length === 0) return;
  flushing = true;
  try {
    const batch = queue.slice(0, BATCH);
    // one last check at the door: nothing unsafe leaves the device, whatever got into storage
    for (const item of batch) if (item.type === "record") assertHealthWorkerSafe(item.event);

    const res = await fetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: batch }),
    });
    if (!res.ok) throw new Error(`The sync server answered ${res.status}.`);

    const sent = new Set(batch.map((i) => i.id));
    write(QUEUE_KEY, readQueue().filter((i) => !sent.has(i.id)));
    write(META_KEY, { lastSuccessAt: Date.now(), lastProblem: null } satisfies SyncMeta);
  } catch (err) {
    const problem = err instanceof TypeError ? "Couldn't reach the sync server." : err instanceof Error ? err.message : "Sync failed.";
    write(META_KEY, { ...readMeta(), lastProblem: problem } satisfies SyncMeta);
  } finally {
    flushing = false;
  }
}
