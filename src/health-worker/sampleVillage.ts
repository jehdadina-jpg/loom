import { DOMAINS, type CognitiveDomain } from "../data/domains";
import type { HealthWorkerEvent, HealthWorkerRecord } from "./boundary";

/**
 * A sample village for demonstrating the triage list. These people are invented, are
 * always labelled "sample" on screen, and are generated relative to today so the demo
 * stays current. Their records are run through the same trajectory code as real ones —
 * the triage is computed, not typed in.
 */
const DAY = 86_400_000;

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Shape = (daysAgo: number, domain: CognitiveDomain, rand: () => number) => number;

interface SamplePerson {
  id: string;
  fullName: string;
  age: number;
  historyDays: number;
  shape: Shape;
}

const noisy = (base: number, width: number) => (rand: () => number) => base + (rand() - 0.5) * width;

const PEOPLE: SamplePerson[] = [
  {
    id: "sample-devi",
    fullName: "Kamala Devi",
    age: 72,
    historyDays: 56,
    shape: (ago, d, r) => noisy(ago <= 8 && (d === "memory" || d === "language") ? 0.38 : 0.8, 0.12)(r),
  },
  {
    id: "sample-hazarika",
    fullName: "Bina Hazarika",
    age: 68,
    historyDays: 63,
    shape: (ago, d, r) => noisy(ago <= 35 && d === "attention" ? 0.58 : 0.82, 0.12)(r),
  },
  {
    id: "sample-bora",
    fullName: "Ranjit Bora",
    age: 79,
    historyDays: 56,
    shape: (ago, d, r) => noisy(d === "visuospatial" && ago < 28 ? 0.8 - (28 - ago) * 0.009 : 0.8, 0.1)(r),
  },
  {
    id: "sample-gogoi",
    fullName: "Sabitri Gogoi",
    age: 81,
    historyDays: 49,
    // good days and harder days: the swing is per day, not per tap
    shape: (ago, _d, r) => noisy(ago <= 14 ? (ago % 3 === 0 ? 0.4 : ago % 3 === 1 ? 0.95 : 0.75) : 0.72, 0.1)(r),
  },
  { id: "sample-saikia", fullName: "Mohan Saikia", age: 74, historyDays: 60, shape: (_a, _d, r) => noisy(0.78, 0.14)(r) },
  { id: "sample-phukan", fullName: "Tarun Phukan", age: 70, historyDays: 6, shape: (_a, _d, r) => noisy(0.75, 0.14)(r) },
];

export function sampleVillage(now = Date.now()): HealthWorkerRecord[] {
  const today = new Date(now);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return PEOPLE.map((p, i) => {
    const rand = rng(1009 * (i + 1));
    // a separate stream, so adding wayfinding never shifts the activity data above
    const walk = rng(7919 * (i + 1));
    const events: HealthWorkerEvent[] = [];
    for (let ago = p.historyDays - 1; ago >= 0; ago--) {
      const dayStart = midnight - ago * DAY + 9.5 * 3600_000;
      events.push({ kind: "session_start", t: dayStart, sessionId: `${p.id}-${ago}` });
      DOMAINS.forEach((domain, di) => {
        for (let k = 0; k < 3; k++) {
          const independence = Math.min(1, Math.max(0, p.shape(ago, domain, rand)));
          const cue = Math.min(4, Math.max(0, Math.round((1 - independence) * 4 + (rand() - 0.5) * 0.8)));
          events.push({ kind: "activity", t: dayStart + (di * 3 + k) * 60_000, domain, cue, elapsedMs: 20_000 + cue * 6_000 });
        }
      });
      for (let trip = 0; trip < 3; trip++) {
        const harder = p.id === "sample-devi" && ago <= 8 ? 2 : 0;
        events.push({ kind: "wayfinding", t: dayStart + (15 * 60 + trip * 10) * 1000, extraTaps: Math.max(0, Math.round(walk() * 1.2 + harder - 0.3)) });
      }
      events.push({ kind: "session_end", t: dayStart + 16 * 60_000, sessionId: `${p.id}-${ago}` });
    }
    return {
      sample: true,
      person: {
        id: p.id,
        fullName: p.fullName,
        age: p.age,
        enrolledAt: midnight - p.historyDays * DAY,
        pronouns: "name" as const,
      },
      events,
    };
  });
}
