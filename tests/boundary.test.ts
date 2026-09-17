/**
 * Rule 8: no health-worker route can reach vault media, relatives' names or session content.
 * Enforced two ways — by the import graph of every health-worker file, and by what the
 * data layer actually returns when the device is full of family data.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertHealthWorkerSafe,
  project,
  readLocalRecords,
  readEnrolledPeople,
  type KeyValueStore,
} from "../src/health-worker/boundary";

const ROOT = resolve(__dirname, "..");
const SRC = join(ROOT, "src");

function allFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(join(ROOT, rel)).isDirectory() ? allFiles(rel) : /\.tsx?$/.test(name) ? [rel] : [];
  });
}

/** Vault modules declare themselves with a marker comment, so a new one is covered the moment it's marked. */
const VAULT_MODULES = allFiles("src").filter((f) => readFileSync(join(ROOT, f), "utf8").includes("@loom-vault"));

/** Family-only modules that aren't vault content but still must not reach a health worker. */
const FAMILY_ONLY = [
  "src/game/telemetry/store.tsx", // which activity, what was chosen
  "src/game/reminders/ReminderContext.tsx", // the family's reminder labels and photos
  "src/game/reminders/model.ts",
  "src/game/alerts/AlertsContext.tsx",
  "src/data/activities.ts", // activity content
  "src/data/npcs.ts", // relatives in the village
  "src/data/dialogue.ts",
  "src/data/story.ts",
  "src/game/wellbeing/checkin.ts", // the caregiver's own answers
  // caregiver screens that show vault content
  "src/components/caregiver/PhotosPanel.tsx",
  "src/components/caregiver/AlbumPanel.tsx",
  "src/components/caregiver/PeoplePanel.tsx",
  "src/components/caregiver/SettingsPanel.tsx",
  "src/routes/care/CareRoute.tsx",
];

const FORBIDDEN = [...VAULT_MODULES, ...FAMILY_ONLY];

/** Everything that makes up the /asha route. */
const HEALTH_WORKER_ENTRIES = [...allFiles("src/routes/asha"), ...allFiles("src/components/health-worker"), ...allFiles("src/health-worker")];

describe("vault modules are marked", () => {
  it("includes photos, the voice recording, album moments and family details", () => {
    expect(VAULT_MODULES).toEqual(
      expect.arrayContaining([
        "src/game/photos/PhotoLibrary.tsx",
        "src/game/state/SettingsContext.tsx",
        "src/game/session/SessionContext.tsx",
        "src/game/profiles/ProfileContext.tsx",
      ]),
    );
  });
});

function resolveImport(from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null; // packages are not family data
  const base = resolve(dirname(join(ROOT, from)), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate.slice(ROOT.length + 1).replace(/\\/g, "/");
  }
  return null;
}

/** Runtime imports only — `import type` is erased and carries no data. */
function runtimeImports(file: string): string[] {
  const text = readFileSync(join(ROOT, file), "utf8");
  const specs = [...text.matchAll(/^\s*import\s+(?!type\s)(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']/gm)].map((m) => m[1]);
  return specs.flatMap((s) => resolveImport(file, s) ?? []);
}

function reachable(entry: string): Map<string, string[]> {
  const seen = new Map<string, string[]>([[entry, [entry]]]);
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift()!;
    for (const dep of runtimeImports(file)) {
      if (seen.has(dep)) continue;
      seen.set(dep, [...seen.get(file)!, dep]);
      queue.push(dep);
    }
  }
  return seen;
}

describe("/asha import graph", () => {
  for (const entry of HEALTH_WORKER_ENTRIES) {
    it(`${entry} cannot import any vault or family-only module, directly or indirectly`, () => {
      const graph = reachable(entry);
      const leaks = FORBIDDEN.filter((f) => graph.has(f)).map((f) => graph.get(f)!.join(" → "));
      expect(leaks).toEqual([]);
    });
  }
});

function fakeStore(data: Record<string, unknown>): KeyValueStore {
  const map = new Map(Object.entries(data).map(([k, v]) => [k, JSON.stringify(v)]));
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

describe("health-worker data layer", () => {
  const FAMILY_SECRETS = ["Ramal's household", "late husband", "Bikash", "data:image", "data:audio", "Making Tea", "the white tablet"];

  const store = fakeStore({
    loom_profiles_v1: {
      activeId: "p1",
      profiles: [
        {
          id: "p1",
          name: "Ramal's household",
          notes: "Asked for her late husband. Bikash visits on Sundays.",
          createdAt: 1_700_000_000_000,
          person: { fullName: "Kamala Devi", birthYear: 1954, pronouns: "she" },
        },
        // a household with no personal details isn't enrolled — its label must not stand in
        { id: "p2", name: "Bikash's house", notes: "", createdAt: 1_700_000_000_000 },
      ],
    },
    loom_hw_record_v1__p1: [
      { kind: "activity", t: 1, domain: "memory", cue: 1, elapsedMs: 20000, activityId: "hearth-sequence", title: "Making Tea" },
      { kind: "reminder_done", t: 2, category: "medicine", latencyMs: 30000, label: "the white tablet", photo: "data:image/jpeg;base64,AAAA" },
      { kind: "session_start", t: 3, sessionId: "s1", voice: "data:audio/webm;base64,BBBB" },
      { kind: "memory", t: 4, note: "Made tea at the hearth" },
    ],
    loom_photos_v1__p1: [{ id: "ph1", dataUrl: "data:image/jpeg;base64,CCCC", caption: "Bikash at the river" }],
    loom_settings_v1__p1: { familyVoiceUrl: "data:audio/webm;base64,DDDD" },
    loom_session_v1__p1: { memories: [{ title: "Making Tea", note: "Made tea at the hearth" }] },
  });

  it("returns only name, age, enrolment date and pronoun choice for people", () => {
    const people = readEnrolledPeople(store, new Date(2026, 8, 17));
    expect(people).toEqual([{ id: "p1", fullName: "Kamala Devi", age: 72, enrolledAt: 1_700_000_000_000, pronouns: "she" }]);
  });

  it("strips every field outside the boundary from stored records, and drops unknown kinds", () => {
    const records = readLocalRecords(store, new Date(2026, 8, 17));
    const json = JSON.stringify(records);
    for (const secret of FAMILY_SECRETS) expect(json).not.toContain(secret);
    expect(records[0].events.map((e) => e.kind)).toEqual(["activity", "reminder_done", "session_start"]);
  });

  it("refuses records carrying extra fields", () => {
    expect(() => assertHealthWorkerSafe({ kind: "activity", t: 1, domain: "memory", cue: 0, elapsedMs: 1, photo: "x" })).toThrow();
    expect(() => assertHealthWorkerSafe({ kind: "memory", t: 1 })).toThrow();
    expect(project({ kind: "rudas", t: 1, total: 20, items: { memory: 4, notes: "x" }, administeredBy: "Rupa" })).toEqual({
      kind: "rudas",
      t: 1,
      total: 20,
      items: { memory: 4 },
      administeredBy: "Rupa",
    });
  });
});
