/**
 * THE HEALTH-WORKER BOUNDARY.
 *
 * Everything that can reach a health worker (the ASHA screens, the sync server) passes
 * through this file, and only in the shapes defined here. What a health worker sees is a
 * trend and a triage state. What they can never see, by construction:
 *
 *   · family photographs and voice recordings (the Memory Vault)
 *   · relatives' names — including household labels and caregiver notes
 *   · session content — which activity, what was chosen, album notes, reminder labels
 *
 * This module deliberately imports nothing from the vault, session, settings, reminder or
 * story modules. tests/boundary.test.ts walks the import graph of every ASHA file to hold
 * that line, and checks every projected record against the whitelist below.
 */
import { DOMAINS, type CognitiveDomain } from "../data/domains";

export type HealthWorkerEvent =
  /** One finished activity: its domain, how much help it needed (0–4), and how long it took. */
  | { kind: "activity"; t: number; domain: CognitiveDomain; cue: number; elapsedMs: number }
  | { kind: "session_start"; t: number; sessionId: string }
  | { kind: "session_end"; t: number; sessionId: string }
  /** One trip between places in the village: only how many extra taps it took, never where to. */
  | { kind: "wayfinding"; t: number; extraTaps: number }
  /** A reminder marked done by the person: its category and the response delay only — never its label. */
  | { kind: "reminder_done"; t: number; category: string; latencyMs: number }
  | { kind: "rudas"; t: number; total: number; items: Record<string, number>; administeredBy: string };

/** Every key each kind of record may carry. Anything else is refused. */
export const ALLOWED_KEYS: Record<HealthWorkerEvent["kind"], readonly string[]> = {
  activity: ["kind", "t", "domain", "cue", "elapsedMs"],
  session_start: ["kind", "t", "sessionId"],
  session_end: ["kind", "t", "sessionId"],
  wayfinding: ["kind", "t", "extraTaps"],
  reminder_done: ["kind", "t", "category", "latencyMs"],
  rudas: ["kind", "t", "total", "items", "administeredBy"],
};

const RUDAS_ITEM_KEYS = ["memory", "bodyOrientation", "praxis", "drawing", "judgement", "language"];
const REMINDER_CATEGORIES = ["medicine", "hydration", "activity", "appointment"];

export class BoundaryViolation extends Error {}

/** Throws unless the value is exactly one of the whitelisted shapes. Used on every read and every sync. */
export function assertHealthWorkerSafe(value: unknown): asserts value is HealthWorkerEvent {
  if (!value || typeof value !== "object") throw new BoundaryViolation("not a record");
  const v = value as Record<string, unknown>;
  const allowed = ALLOWED_KEYS[v.kind as HealthWorkerEvent["kind"]];
  if (!allowed) throw new BoundaryViolation(`unknown kind ${String(v.kind)}`);
  for (const k of Object.keys(v)) {
    if (!allowed.includes(k)) throw new BoundaryViolation(`${String(v.kind)} may not carry "${k}"`);
  }
  if (typeof v.t !== "number") throw new BoundaryViolation("missing time");
  if (v.kind === "activity" && !DOMAINS.includes(v.domain as CognitiveDomain)) throw new BoundaryViolation("bad domain");
  if (v.kind === "reminder_done" && !REMINDER_CATEGORIES.includes(v.category as string)) {
    throw new BoundaryViolation("bad category");
  }
  if (v.kind === "rudas") {
    for (const k of Object.keys((v.items as object) ?? {})) {
      if (!RUDAS_ITEM_KEYS.includes(k)) throw new BoundaryViolation(`rudas item "${k}"`);
    }
  }
}

/** Keeps only what the boundary allows, dropping everything else, then checks the result. */
export function project(raw: Record<string, unknown>): HealthWorkerEvent | null {
  const allowed = ALLOWED_KEYS[raw.kind as HealthWorkerEvent["kind"]];
  if (!allowed) return null;
  const out: Record<string, unknown> = {};
  for (const k of allowed) if (k in raw) out[k] = raw[k];
  if (out.kind === "rudas" && out.items) {
    out.items = Object.fromEntries(Object.entries(out.items as object).filter(([k]) => RUDAS_ITEM_KEYS.includes(k)));
  }
  try {
    assertHealthWorkerSafe(out);
    return out;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- the local record

export const RECORD_KEY = "loom_hw_record_v1";
const PROFILES_KEY = "loom_profiles_v1";
const MAX_RECORD = 6000;

/** Minimal storage surface, so tests can run this without a browser. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface EnrolledPerson {
  id: string;
  /** Only the person's own name, as entered in their details. Never the household label. */
  fullName: string;
  age: number | null;
  enrolledAt: number;
  pronouns: "name" | "she" | "he" | "they";
}

export interface HealthWorkerRecord {
  person: EnrolledPerson;
  events: HealthWorkerEvent[];
  sample?: boolean;
}

function parse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Reads the people on this device, keeping only name, age and enrolment date. */
export function readEnrolledPeople(store: KeyValueStore, now = new Date()): EnrolledPerson[] {
  const state = parse<{ profiles?: Array<Record<string, unknown>> }>(store.getItem(PROFILES_KEY), {});
  return (state.profiles ?? []).flatMap((p) => {
    const person = p.person as { fullName?: string; birthYear?: number | null; pronouns?: EnrolledPerson["pronouns"] } | undefined;
    // someone with no personal details entered isn't enrolled — the household label is not a substitute
    if (!person?.fullName?.trim()) return [];
    return [
      {
        id: String(p.id),
        fullName: person.fullName.trim(),
        age: person.birthYear ? now.getFullYear() - person.birthYear : null,
        enrolledAt: typeof p.createdAt === "number" ? p.createdAt : Date.now(),
        pronouns: person.pronouns ?? "name",
      },
    ];
  });
}

export function readRecordEvents(store: KeyValueStore, profileId: string): HealthWorkerEvent[] {
  const raw = parse<unknown[]>(store.getItem(`${RECORD_KEY}__${profileId}`), []);
  return raw.flatMap((e) => {
    const safe = project(e as Record<string, unknown>);
    return safe ? [safe] : [];
  });
}

export function appendRecordEvent(store: KeyValueStore, profileId: string, event: HealthWorkerEvent): boolean {
  const safe = project(event as unknown as Record<string, unknown>);
  if (!safe) return false;
  const key = `${RECORD_KEY}__${profileId}`;
  const list = parse<HealthWorkerEvent[]>(store.getItem(key), []);
  list.push(safe);
  try {
    store.setItem(key, JSON.stringify(list.slice(-MAX_RECORD)));
  } catch {
    return false;
  }
  return true;
}

export function readLocalRecords(store: KeyValueStore, now = new Date()): HealthWorkerRecord[] {
  return readEnrolledPeople(store, now).map((person) => ({ person, events: readRecordEvents(store, person.id) }));
}
