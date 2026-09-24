/**
 * THE DEMONSTRATION PERSON — one invented family, generated relative to today, for showing
 * what the care console looks like once it has history behind it. Nothing here is typed in
 * as a conclusion: the record is a plain list of activities, and every panel in the app
 * computes its own reading from it exactly as it would for a real family.
 *
 * The story the data tells, if you follow it through:
 *
 *   · Recognition is holding up while recall isn't — she names people from photographs
 *     unaided, and needs the name said first for everything else. Both halves of that come
 *     from the same record, which is what makes the Help Shape headline honest.
 *   · Her days have grown further apart from each other without the average moving much.
 *   · Mornings are markedly better than evenings.
 *   · The caregiver's own read agrees with what's measured — which is itself a finding.
 *
 * It is labelled a demonstration wherever it is offered, and removing it takes every key
 * back out again. See tests/demo-data.test.ts, which asserts the patterns above actually
 * come out of the generated record rather than trusting this comment.
 */
import type { CognitiveDomain } from "../../data/domains";
import type { HealthWorkerEvent } from "../../health-worker/boundary";
import type { TelemetryEvent } from "../telemetry/store";
import type { Profile } from "../profiles/ProfileContext";
import type { FamilyPhoto } from "../photos/PhotoLibrary";
import type { Reminder, ReminderLogEntry } from "../reminders/model";
import type { RudasRecord } from "../clinical/rudas";
import type { MoodState } from "../mood/mood";
import type { WellbeingState } from "../wellbeing/checkin";
import type { Appointment } from "../visit/appointment";
import type { PrepAnswers } from "../visit/prep";
import type { VisitRecord } from "../visit/visitHistory";

const DAY = 86_400_000;
const HISTORY_DAYS = 63;
/** Telemetry keeps only its last few hundred events, so the detailed log covers recent days. */
const TELEMETRY_DAYS = 9;

export const DEMO_PROFILE_ID = "demo-kamala";
/** Deliberately not a name the health worker's sample village already uses. */
export const DEMO_PERSON_NAME = "Nirmala Kalita";

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

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const cueFrom = (independence: number) => Math.min(4, Math.max(0, Math.round((1 - clamp01(independence)) * 4)));

// ---------------------------------------------------------------- the shape of her weeks

/**
 * Independence (0–1) per domain, by how many days ago. Recall and recognition are split
 * because that split is the whole point: they are different tasks, and they part company.
 * These land on cue levels once quantised, which is what every panel actually reads.
 */
function recallIndependence(ago: number): number {
  if (ago >= 49) return 0.9; // her own first two weeks, doing it unaided
  if (ago >= 35) return 0.9 - ((49 - ago) / 14) * 0.4; // the ground shifting, over a month
  return 0.5; // needing the name said first, and then she has it
}

function languageIndependence(ago: number): number {
  if (ago >= 17) return 0.88;
  return 0.88 - ((17 - ago) / 17) * 0.28;
}

function attentionIndependence(ago: number, day: number): number {
  if (ago >= 15) return 0.7;
  // good days and hard days, swinging either side of the same average she always had
  return day % 2 === 0 ? 1.05 : 0.45;
}

/**
 * Lately a hard day is a hard day across the board, not in one domain alone — which is how
 * families describe it, and what makes the spread widen while the average stays put. A good
 * day takes one step less help than usual, a hard one a step more, either side of the same
 * average. The recall tasks she needs naming for are left out: those are steady at their own
 * level, which is the distinction the help-shape panel exists to show.
 */
function daySwing(ago: number, day: number): number {
  if (ago >= 21) return 0;
  return day % 2 === 0 ? -1 : 1;
}

/** Sessions land in different parts of the day, and the day itself changes what she can do. */
const WINDOW_EFFECT = { morning: 0.08, midday: 0.02, afternoon: -0.03, evening: -0.14 };
type WindowName = keyof typeof WINDOW_EFFECT;

const SECOND_SESSION: WindowName[] = ["midday", "afternoon", "evening"];
const HOUR_OF: Record<WindowName, number> = { morning: 9.5, midday: 12.5, afternoon: 16.25, evening: 19.5 };

interface PlannedActivity {
  activityId: string;
  domain: CognitiveDomain;
  cue: number;
  at: number;
  elapsedMs: number;
}

interface PlannedSession {
  sessionId: string;
  activityId: string;
  startedAt: number;
  endedAt: number;
  window: WindowName;
  activities: PlannedActivity[];
}

const RECALL_IDS = ["home-pairs-kitchen", "market-pairs-goods", "veranda-pairs-family"];
const RECOGNITION_IDS = ["veranda-faces", "veranda-faces-deeplia"];
/** Making tea is practised into the bone; the market errand is a newer, longer chain. */
const ATTENTION_PRACTISED = "hearth-sequence";
const ATTENTION_OTHER = ["market-errand", "home-evening-order"];
const LANGUAGE_IDS = ["market-cloth-colour", "home-odd-one", "market-match"];
const SPEED_IDS = ["home-count-cups", "market-count-fruit", "field-count-baskets"];
const VISUOSPATIAL_IDS = ["home-firewood", "market-identify", "garden-flowers"];

const pick = (list: string[], i: number) => list[i % list.length];

/**
 * The whole history as a plain plan of days and sessions. Both the health-worker record and
 * the on-device telemetry are emitted from this one plan, so the two can never disagree.
 */
export function demoPlan(now: number): PlannedSession[] {
  const today = new Date(now);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const rand = rng(20260924);
  const noise = (w: number) => (rand() - 0.5) * w;
  const sessions: PlannedSession[] = [];

  for (let ago = HISTORY_DAYS - 1; ago >= 0; ago--) {
    const dayIndex = HISTORY_DAYS - 1 - ago;
    const dayStart = midnight - ago * DAY;
    const windows: WindowName[] = ["morning", SECOND_SESSION[dayIndex % SECOND_SESSION.length]];

    windows.forEach((window, wi) => {
      const base = dayStart + HOUR_OF[window] * 3600_000;
      const effect = WINDOW_EFFECT[window];
      const swing = daySwing(ago, dayIndex);
      const acts: PlannedActivity[] = [];
      /** `swings` marks the tasks that ride the day; the rest sit at their own level. */
      const add = (activityId: string, domain: CognitiveDomain, independence: number, swings = true) =>
        acts.push({
          activityId,
          domain,
          cue: Math.min(4, Math.max(0, cueFrom(independence + effect + noise(0.06)) + (swings ? swing : 0))),
          at: base + acts.length * 150_000,
          elapsedMs: 0,
        });

      if (wi === 0) {
        // she still knows the faces; it is the recall tasks that need the name said first
        add(pick(RECOGNITION_IDS, dayIndex), "memory", 1.1, false);
        add(pick(RECALL_IDS, dayIndex), "memory", recallIndependence(ago), false);
        const good = ago >= 15 || dayIndex % 2 === 0;
        add(good ? ATTENTION_PRACTISED : pick(ATTENTION_OTHER, dayIndex), "attention", attentionIndependence(ago, dayIndex), false);
      } else {
        add(pick(RECALL_IDS, dayIndex + 1), "memory", recallIndependence(ago), false);
        add(pick(RECALL_IDS, dayIndex + 2), "memory", recallIndependence(ago));
        add(pick(LANGUAGE_IDS, dayIndex), "language", languageIndependence(ago));
        add(pick(SPEED_IDS, dayIndex), "speed", 0.82);
        // finding things around the house and the market has held its own level throughout
        add(pick(VISUOSPATIAL_IDS, dayIndex), "visuospatial", 0.76, false);
      }

      for (const a of acts) a.elapsedMs = 20_000 + a.cue * 6_000;
      sessions.push({
        sessionId: `demo-${ago}-${wi}`,
        activityId: acts[0].activityId,
        startedAt: base - 60_000,
        endedAt: base + acts.length * 150_000 + 90_000,
        window,
        activities: acts,
      });
    });
  }
  return sessions;
}

// ---------------------------------------------------------------- the health-worker record

export function demoRecord(now: number): HealthWorkerEvent[] {
  const plan = demoPlan(now);
  const walk = rng(4409);
  const events: HealthWorkerEvent[] = [];

  for (const s of plan) {
    events.push({ kind: "session_start", t: s.startedAt, sessionId: s.sessionId });
    for (const a of s.activities) {
      events.push({ kind: "activity", t: a.at, domain: a.domain, cue: a.cue, elapsedMs: a.elapsedMs });
    }
    // she finds her way around the village without prompting; that is a skill, and it holds
    for (let trip = 0; trip < 2; trip++) {
      events.push({ kind: "wayfinding", t: s.startedAt + 30_000 + trip * 20_000, extraTaps: walk() < 0.85 ? 0 : 1 });
    }
    events.push({ kind: "session_end", t: s.endedAt, sessionId: s.sessionId });
  }

  // the tablet still gets taken, but it is answered more slowly than it was two months ago
  const start = plan[0].startedAt;
  for (let ago = HISTORY_DAYS - 1; ago >= 0; ago -= 1) {
    const t = start + (HISTORY_DAYS - 1 - ago) * DAY + 8 * 3600_000;
    const drift = (HISTORY_DAYS - 1 - ago) / HISTORY_DAYS;
    events.push({ kind: "reminder_done", t, category: "medicine", latencyMs: Math.round((55 + drift * 180) * 1000) });
  }

  return events.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- the on-device telemetry

const PHOTO_WEDDING = "demo-photo-wedding";
const PHOTO_TEA = "demo-photo-tea";
const PHOTO_BIHU = "demo-photo-bihu";
const PHOTO_HOUSE = "demo-photo-house";

/** How long she stayed with each thing in the vault, and whether the moment carried. */
const COMFORT_PLAN: { itemId: string; contentType: string; dwellMs: number; shows: number; continues: boolean }[] = [
  { itemId: PHOTO_WEDDING, contentType: "photos", dwellMs: 76_000, shows: 6, continues: true },
  { itemId: "song", contentType: "song", dwellMs: 92_000, shows: 6, continues: true },
  { itemId: PHOTO_TEA, contentType: "photos", dwellMs: 54_000, shows: 5, continues: true },
  { itemId: PHOTO_HOUSE, contentType: "photos", dwellMs: 44_000, shows: 4, continues: false },
  { itemId: PHOTO_BIHU, contentType: "photos", dwellMs: 13_000, shows: 4, continues: false },
  { itemId: "story", contentType: "story", dwellMs: 19_000, shows: 4, continues: false },
];

/** The people who actually live in this village, so the vault and the world agree. */
const NPC_VISITS = ["bimal", "deeplia", "rumak", "vendor"];

export function demoTelemetry(now: number): TelemetryEvent[] {
  const plan = demoPlan(now);
  const recent = plan.filter((s) => s.startedAt > now - TELEMETRY_DAYS * DAY);
  const rand = rng(881);
  const events: TelemetryEvent[] = [];

  recent.forEach((s, si) => {
    events.push({ type: "session_start", sessionId: s.sessionId, activityId: s.activityId, chosenBy: si % 3 === 0 ? "caregiver" : "app", timestamp: s.startedAt });
    for (let trip = 0; trip < 2; trip++) {
      events.push({ type: "navigate", to: "village", misses: rand() < 0.85 ? 0 : 1, elapsedMs: 4_000 + Math.round(rand() * 3_000), timestamp: s.startedAt + 20_000 + trip * 15_000 });
    }
    if (si % 2 === 0) {
      events.push({ type: "dialogue", npcId: NPC_VISITS[si % NPC_VISITS.length], locationId: "veranda", timestamp: s.startedAt + 55_000 });
    }
    for (const a of s.activities) {
      const isPrimary = a.activityId === s.activityId;
      if (isPrimary) events.push({ type: "activity_start", activityId: a.activityId, domain: a.domain, timestamp: a.at - 20_000 });
      // the answers reached, each at the cue level that was showing when it landed
      for (let part = 0; part < 2; part++) {
        events.push({ type: "activity_attempt", activityId: a.activityId, correct: true, cueLevel: a.cue, timestamp: a.at - 15_000 + part * 4_000 });
      }
      events.push({
        type: "activity_complete",
        activityId: a.activityId,
        domain: a.domain,
        attempts: 2 + a.cue,
        cueLevelReached: a.cue,
        elapsedMs: a.elapsedMs,
        timestamp: a.at,
      });
    }
    events.push({ type: "session_end", sessionId: s.sessionId, timestamp: s.endedAt });
  });

  // the vault visits, threaded through the same days
  const anchors = recent.filter((s) => s.window === "morning");
  for (const item of COMFORT_PLAN) {
    for (let k = 0; k < item.shows; k++) {
      const anchor = anchors[(k * 2 + item.itemId.length) % anchors.length];
      // before the activities when the moment carried into what came next, after them when it didn't
      const at = item.continues ? anchor.activities[0].at - 90_000 : anchor.endedAt + 60_000;
      events.push({ type: "comfort", locationId: "waterpoint", contentType: item.contentType, itemId: item.itemId, dwellMs: item.dwellMs, timestamp: at });
    }
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

// ---------------------------------------------------------------- the family's own things

/** Simple drawn scenes, not photographs of anyone — the captions carry the meaning. */
function scene(body: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="#f0e2c4"/>${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const WEDDING = scene(
  '<rect y="86" width="160" height="34" fill="#cbb389"/><path d="M42 86V54a38 38 0 0 1 76 0v32" fill="none" stroke="#c25a2e" stroke-width="7"/><circle cx="66" cy="62" r="9" fill="#8a5a3b"/><circle cx="94" cy="62" r="9" fill="#8a5a3b"/><path d="M57 86c0-10 4-16 9-16s9 6 9 16z" fill="#a8643b"/><path d="M85 86c0-10 4-16 9-16s9 6 9 16z" fill="#c25a2e"/><circle cx="50" cy="40" r="4" fill="#f2b233"/><circle cx="110" cy="40" r="4" fill="#f2b233"/>',
);
const TEA_GARDEN = scene(
  '<rect width="160" height="66" fill="#dcd0ad"/><circle cx="128" cy="24" r="12" fill="#f2b233"/><path d="M0 66l40-22 38 14 42-20 40 16v78H0z" fill="#6fa34f"/><g fill="#4f7a37"><circle cx="24" cy="86" r="8"/><circle cx="56" cy="94" r="8"/><circle cx="90" cy="86" r="8"/><circle cx="124" cy="96" r="8"/><circle cx="42" cy="110" r="8"/><circle cx="106" cy="112" r="8"/></g>',
);
const BIHU = scene(
  '<rect y="88" width="160" height="32" fill="#cbb389"/><circle cx="58" cy="60" r="11" fill="#8a5a3b"/><path d="M47 88c0-12 5-18 11-18s11 6 11 18z" fill="#f2b233"/><circle cx="104" cy="64" r="9" fill="#8a5a3b"/><path d="M95 88c0-10 4-15 9-15s9 5 9 15z" fill="#c25a2e"/><ellipse cx="80" cy="76" rx="14" ry="9" fill="#a8643b"/><path d="M20 30h120" stroke="#c25a2e" stroke-width="3"/><circle cx="40" cy="36" r="4" fill="#6fa34f"/><circle cx="80" cy="36" r="4" fill="#f2b233"/><circle cx="120" cy="36" r="4" fill="#c25a2e"/>',
);
const OLD_HOUSE = scene(
  '<rect y="84" width="160" height="36" fill="#cbb389"/><path d="M28 84V48h64v36z" fill="#e8dcc0" stroke="#8a5a3b" stroke-width="3"/><path d="M20 50l40-24 40 24z" fill="#a8643b"/><rect x="50" y="62" width="18" height="22" fill="#6b5d4a"/><circle cx="126" cy="60" r="18" fill="#6fa34f"/><rect x="123" y="60" width="6" height="26" fill="#8a5a3b"/>',
);

export function demoPhotos(now: number): FamilyPhoto[] {
  return [
    { id: PHOTO_WEDDING, dataUrl: WEDDING, caption: "Her wedding day, 1974", addedAt: now - 40 * DAY },
    { id: PHOTO_TEA, dataUrl: TEA_GARDEN, caption: "The tea garden at Titabor, where she worked for thirty years", addedAt: now - 38 * DAY },
    { id: PHOTO_HOUSE, dataUrl: OLD_HOUSE, caption: "The old house at Golaghat, before Bimal was born", addedAt: now - 30 * DAY },
    { id: PHOTO_BIHU, dataUrl: BIHU, caption: "Rumak and Naren at Bihu, last year", addedAt: now - 12 * DAY },
  ];
}

export function demoReminders(now: number, appointment: Appointment): Reminder[] {
  return [
    { id: "demo-r1", category: "medicine", label: "The white tablet, with breakfast", schedule: { kind: "daily", times: ["08:00"] }, photo: null, escalate: true, createdAt: now - 50 * DAY },
    { id: "demo-r2", category: "medicine", label: "The blood pressure tablet", schedule: { kind: "daily", times: ["20:00"] }, photo: null, escalate: true, createdAt: now - 50 * DAY },
    { id: "demo-r3", category: "hydration", label: "A glass of water", schedule: { kind: "daily", times: ["11:00", "15:00"] }, photo: null, escalate: false, createdAt: now - 48 * DAY },
    { id: "demo-r4", category: "activity", label: "A walk to the gate with Deeplia", schedule: { kind: "weekly", days: [1, 3, 5], time: "17:00" }, photo: null, escalate: false, createdAt: now - 20 * DAY },
    {
      id: "demo-r5",
      category: "appointment",
      label: `${appointment.doctorName} — ${appointment.speciality}`,
      schedule: { kind: "once", date: appointment.date },
      photo: null,
      escalate: true,
      createdAt: now - 9 * DAY,
    },
  ];
}

/**
 * Two weeks of the daily reminders being answered — including today's, up to whatever time
 * the demonstration is loaded, so Today reads as a day in progress rather than a neglected
 * one. Answered a little more slowly than they were, and twice not at all.
 */
export function demoReminderLog(now: number, reminders: Reminder[]): ReminderLogEntry[] {
  const today = new Date(now);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const out: ReminderLogEntry[] = [];
  const daily = reminders.filter((r) => r.schedule.kind === "daily");

  for (let ago = 14; ago >= 0; ago--) {
    const day = new Date(midnight - ago * DAY);
    const stamp = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    for (const r of daily) {
      if (r.schedule.kind !== "daily") continue;
      for (const time of r.schedule.times) {
        const [h, m] = time.split(":").map(Number);
        const scheduledFor = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime();
        const latency = 60_000 + Math.round((14 - ago) * 9_000);
        if (scheduledFor + latency > now) continue; // not due yet, or still within the window
        // the evening tablet slipped twice this fortnight, which is what raised the alert
        if (r.id === "demo-r2" && (ago === 1 || ago === 8)) continue;
        const key = `${r.id}|${stamp}|${time}`;
        out.push({ type: "fired", key, reminderId: r.id, category: r.category, scheduledFor, timestamp: scheduledFor });
        out.push({ type: "shown", key, reminderId: r.id, timestamp: scheduledFor + 20_000 });
        out.push({ type: "done", key, reminderId: r.id, category: r.category, by: "patient", latencyMs: latency, timestamp: scheduledFor + 20_000 + latency });
      }
    }
  }
  return out;
}

export function demoRudas(now: number): RudasRecord[] {
  return [
    {
      id: "demo-rudas-1",
      date: now - 77 * DAY,
      administeredBy: "Rupa Das (ASHA)",
      scores: { memory: 5, bodyOrientation: 5, praxis: 2, drawing: 3, judgement: 3, language: 6 },
      total: 24,
    },
    {
      id: "demo-rudas-2",
      date: now - 8 * DAY,
      administeredBy: "Rupa Das (ASHA)",
      scores: { memory: 2, bodyOrientation: 5, praxis: 2, drawing: 2, judgement: 3, language: 5 },
      total: 19,
    },
  ];
}

/** Her daughter's own read of the last three weeks, left exactly as she gave it. */
export function demoMood(now: number): MoodState {
  const reads: [number, "easier" | "same" | "harder"][] = [
    [19, "same"],
    [16, "harder"],
    [14, "harder"],
    [11, "same"],
    [9, "harder"],
    [6, "harder"],
    [4, "easier"],
    [2, "harder"],
  ];
  return {
    entries: reads.map(([ago, read]) => ({ sessionId: `demo-${ago}-0`, at: now - ago * DAY + 11 * 3600_000, read })),
    skippedSessionIds: [],
  };
}

export function demoWellbeing(now: number): WellbeingState {
  const monday = (t: number) => {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime();
  };
  const weeks: [number, Record<string, number>][] = [
    [35, { "own-time": 2, stretched: 2, sleep: 3, health: 1, handover: 2 }],
    [28, { "own-time": 2, stretched: 2, sleep: 2, health: 2, handover: 2 }],
    [21, { "own-time": 1, stretched: 3, sleep: 2, health: 2, handover: 1 }],
    [14, { "own-time": 1, stretched: 3, sleep: 1, health: 3, handover: 1 }],
    [7, { "own-time": 0, stretched: 4, sleep: 1, health: 3, handover: 1 }],
  ];
  return {
    checkins: weeks.map(([ago, answers]) => ({ id: `demo-w${ago}`, week: monday(now - ago * DAY), at: now - ago * DAY, answers })),
    skippedWeeks: [],
    noticesSeen: [],
  };
}

export function demoAppointments(now: number): Appointment[] {
  const at = (days: number, hour: number, minute: number) => {
    const d = new Date(now + days * DAY);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute).getTime();
  };
  return [
    {
      id: "demo-appt-past",
      doctorName: "Dr Baruah",
      speciality: "the memory doctor at the district hospital",
      date: at(-42, 11, 0),
      place: "District Hospital, Jorhat",
      createdAt: now - 56 * DAY,
    },
    {
      id: "demo-appt-next",
      doctorName: "Dr Baruah",
      speciality: "the memory doctor at the district hospital",
      date: at(4, 10, 30),
      place: "District Hospital, Jorhat — Room 4",
      createdAt: now - 9 * DAY,
    },
  ];
}

export function demoVisitHistory(past: Appointment): VisitRecord[] {
  return [
    {
      id: "demo-visit-1",
      appointmentId: past.id,
      visitDate: past.date,
      whatWasSaid:
        "He listened to all of it and said the forgetting was worth taking seriously rather than putting down to age. Started a small dose of a tablet and asked us to come back in six weeks with a record of how she has been.",
      changes: ["medication-started", "tests-ordered"],
      nextAppointmentDate: null,
      recordedAt: past.date + DAY,
    },
  ];
}

/** Filled in over the week before the appointment, in her daughter's own words. */
export function demoPrep(): PrepAnswers {
  return {
    sleep: "awake",
    sleepNote: "She is up at two or three most nights now, moving around the house.",
    appetite: "less",
    mood: "withdrawn",
    moodNote: "She has stopped sitting out on the veranda in the evenings, which she always used to do.",
    behaviours: ["repeating-questions", "wandering"],
    falls: "yes",
    fallsNote: "Once in the bathroom last month. She caught the door and did not hurt herself.",
    medicineIssue: "missed-doses",
    worries:
      "She walked to the market on her own last week and could not find her way back. A neighbour brought her home. She was not frightened by it, but I was. I need to know whether it is safe for her to go out alone, and if not, how I tell her that without taking away the one thing she still does by herself.",
    questions: [
      "Is it safe for her to go out on her own, and how do we manage it if not?",
      "The tablet she started six weeks ago — is it doing anything, and should she stay on it?",
      "What should I be watching for that would mean bringing her back sooner?",
    ],
  };
}

export function demoProfile(now: number): Profile {
  return {
    id: DEMO_PROFILE_ID,
    name: "Nirmala's household (demo)",
    notes:
      "Grew up in Golaghat, worked in the tea garden at Titabor for thirty years. Her son Bimal and his wife Deeplia live here with her, and the two grandchildren, Rumak and Naren. She is happiest with a cup of tea in her hands and the radio on.",
    createdAt: now - HISTORY_DAYS * DAY,
    person: { fullName: DEMO_PERSON_NAME, birthYear: new Date(now).getFullYear() - 72, pronouns: "she" },
  };
}

export const DEMO_HANDOVER = {
  avoid: ['Rushing her', 'Asking "do you remember"', "Loud television after dark", "Moving the furniture around"].join("\n"),
  people: [
    "Bimal — her son, lives here. She knows his face straight away.",
    "Deeplia — her daughter-in-law, does most of the day with her.",
    "Rumak and Naren — her grandchildren. She is easier with them than with anyone.",
    "Anil — her husband, died in 2019. She sometimes asks where he is. We say he has gone up to the field; correcting her only means she hears it again for the first time.",
  ].join("\n"),
  upset: "Put the radio on and sit down next to her. The wedding photograph settles her more reliably than anything else we have tried.",
  note: "She will say she has already eaten when she has not. Sit down and eat something yourself and she will usually join in.",
};

export const DEMO_CAREGIVER = { name: "Deeplia Kalita", relationship: "daughter-in-law" };

// ---------------------------------------------------------------- what the demo occupies

/** Every store the demonstration writes, so removing it can take exactly these back out. */
export function demoStores(now = Date.now()): Record<string, unknown> {
  const appointments = demoAppointments(now);
  const past = appointments[0];
  const next = appointments[1];
  const reminders = demoReminders(now, next);
  return {
    loom_hw_record_v1: demoRecord(now),
    loom_telemetry_v1: demoTelemetry(now),
    loom_photos_v1: demoPhotos(now),
    loom_reminders_v1: reminders,
    loom_reminder_log_v1: demoReminderLog(now, reminders),
    loom_rudas_v1: demoRudas(now),
    loom_mood_v1: demoMood(now),
    loom_wellbeing_v1: demoWellbeing(now),
    loom_appointments_v1: appointments,
    loom_visit_history_v1: demoVisitHistory(past),
    [`loom_visit_prep_v1__${next.id}`]: demoPrep(),
    loom_caregiver_identity_v1: DEMO_CAREGIVER,
    loom_handover_avoid_v1: DEMO_HANDOVER.avoid,
    loom_handover_people_v1: DEMO_HANDOVER.people,
    loom_handover_upset_v1: DEMO_HANDOVER.upset,
    loom_handover_note_v1: DEMO_HANDOVER.note,
  };
}
