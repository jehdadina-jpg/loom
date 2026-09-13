import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useProfile, scopedKey } from "../profiles/ProfileContext";

export type TelemetryEvent =
  | { type: "navigate"; to: string; misses: number; elapsedMs: number; timestamp: number }
  | { type: "dialogue"; npcId: string; locationId: string; timestamp: number }
  | { type: "comfort"; locationId: string; contentType: string; timestamp: number }
  | { type: "activity_start"; activityId: string; domain: string; timestamp: number }
  | { type: "activity_attempt"; activityId: string; correct: boolean; cueLevel: number; timestamp: number }
  | {
      type: "activity_complete";
      activityId: string;
      domain: string;
      attempts: number;
      cueLevelReached: number;
      elapsedMs: number;
      timestamp: number;
    };

const STORAGE_KEY = "loom_telemetry_v1";
const MAX_EVENTS = 400;

function loadEvents(key: string): TelemetryEvent[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as TelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

function saveEvents(key: string, events: TelemetryEvent[]) {
  try {
    localStorage.setItem(key, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // storage unavailable — telemetry simply won't persist across reloads
  }
}

interface TelemetryContextValue {
  events: TelemetryEvent[];
  log: (e: TelemetryEvent) => void;
  clear: () => void;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const { activeId } = useProfile();
  const key = scopedKey(STORAGE_KEY, activeId);
  const [events, setEvents] = useState<TelemetryEvent[]>(() => loadEvents(key));
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    setEvents(loadEvents(scopedKey(STORAGE_KEY, activeId)));
  }, [activeId]);

  const log = useCallback((e: TelemetryEvent) => {
    setEvents((prev) => {
      const next = [...prev, e].slice(-MAX_EVENTS);
      saveEvents(keyRef.current, next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEvents([]);
    saveEvents(keyRef.current, []);
  }, []);

  const value = useMemo(() => ({ events, log, clear }), [events, log, clear]);
  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry(): TelemetryContextValue {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error("useTelemetry must be used within TelemetryProvider");
  return ctx;
}

// ---------------------------------------------------------------- caregiver-facing summaries

export interface SessionSummary {
  sessionsToday: number;
  totalActivities: number;
  avgCueLevel: number;
  totalNavigationMisses: number;
  totalComfortVisits: number;
  domainCounts: Record<string, number>;
  observations: string[];
  recentActivities: { activityId: string; domain: string; cueLevelReached: number; attempts: number; timestamp: number }[];
}

const CUE_LABELS = ["independent", "a subtle visual cue", "a stronger visual cue", "clear step-by-step guidance", "hands-on assistance"];

export function summarizeSession(events: TelemetryEvent[]): SessionSummary {
  const completions = events.filter((e): e is Extract<TelemetryEvent, { type: "activity_complete" }> => e.type === "activity_complete");
  const navigations = events.filter((e): e is Extract<TelemetryEvent, { type: "navigate" }> => e.type === "navigate");
  const comforts = events.filter((e) => e.type === "comfort");

  const avgCueLevel = completions.length
    ? completions.reduce((s, c) => s + c.cueLevelReached, 0) / completions.length
    : 0;
  const totalNavigationMisses = navigations.reduce((s, n) => s + n.misses, 0);

  const domainCounts: Record<string, number> = {};
  for (const c of completions) domainCounts[c.domain] = (domainCounts[c.domain] ?? 0) + 1;

  const observations: string[] = [];

  if (completions.length === 0 && navigations.length === 0) {
    observations.push("No activity recorded yet in this session.");
  }

  if (navigations.length > 0) {
    if (totalNavigationMisses / Math.max(1, navigations.length) < 0.5) {
      observations.push("Moved through familiar locations with minimal guidance.");
    } else {
      observations.push("Needed a few extra tries when finding certain places in the village.");
    }
  }

  if (completions.length > 0) {
    if (avgCueLevel <= 1) {
      observations.push("Completed today's activities independently, with little to no prompting.");
    } else if (avgCueLevel <= 2.2) {
      observations.push("Needed additional visual cues to complete some activities.");
    } else {
      observations.push("Completed activities after moderate to substantial assistance — consider revisiting simpler versions next time.");
    }

    const speedy = completions.filter((c) => c.elapsedMs < 20000).length;
    if (speedy / completions.length > 0.6) {
      observations.push("Responded quickly and comfortably during most tasks.");
    }
  }

  if (comforts.length > 0) {
    observations.push("Chose to spend time at the water point — appeared to enjoy the quiet, familiar content there.");
  }

  const dialogues = events.filter((e) => e.type === "dialogue").length;
  if (dialogues > 3) {
    observations.push("Engaged socially, initiating conversations with several family members.");
  } else if (dialogues > 0) {
    observations.push("Had a little social interaction during this session.");
  } else if (events.length > 0) {
    observations.push("Low social interaction this session — a family visit or community event may help.");
  }

  const recentActivities = completions
    .slice(-8)
    .reverse()
    .map((c) => ({ activityId: c.activityId, domain: c.domain, cueLevelReached: c.cueLevelReached, attempts: c.attempts, timestamp: c.timestamp }));

  const dayKeys = new Set(events.map((e) => new Date(e.timestamp).toDateString()));

  return {
    sessionsToday: dayKeys.size,
    totalActivities: completions.length,
    avgCueLevel,
    totalNavigationMisses,
    totalComfortVisits: comforts.length,
    domainCounts,
    observations,
    recentActivities,
  };
}

export interface DaySummary {
  dateKey: string;
  label: string;
  activities: number;
  avgCueLevel: number;
  misses: number;
  comfortVisits: number;
}

/** Per-day aggregates, oldest first — the basis of the caregiver trend view. */
export function sessionHistory(events: TelemetryEvent[]): DaySummary[] {
  const byDay = new Map<string, TelemetryEvent[]>();
  for (const e of events) {
    const key = new Date(e.timestamp).toDateString();
    const list = byDay.get(key) ?? [];
    list.push(e);
    byDay.set(key, list);
  }

  return [...byDay.entries()]
    .map(([dateKey, list]) => {
      const completions = list.filter(
        (e): e is Extract<TelemetryEvent, { type: "activity_complete" }> => e.type === "activity_complete",
      );
      const navs = list.filter((e): e is Extract<TelemetryEvent, { type: "navigate" }> => e.type === "navigate");
      return {
        dateKey,
        label: new Date(dateKey).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        activities: completions.length,
        avgCueLevel: completions.length
          ? completions.reduce((s, c) => s + c.cueLevelReached, 0) / completions.length
          : 0,
        misses: navs.reduce((s, n) => s + n.misses, 0),
        comfortVisits: list.filter((e) => e.type === "comfort").length,
      };
    })
    .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime());
}

export function cueLabel(level: number): string {
  const idx = Math.max(0, Math.min(4, Math.round(level)));
  return CUE_LABELS[idx];
}
