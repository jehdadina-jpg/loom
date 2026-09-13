import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LocationId } from "../../data/locations/types";
import { useProfile, scopedKey } from "../profiles/ProfileContext";

/** A gentle, fixed route through the village that covers all five cognitive domains. */
export interface GuideStep {
  locationId: LocationId;
  hotspotId: string;
  prompt: string;
  /** Completed when this activity finishes, or on arrival for pure navigation steps. */
  completeOnActivityId?: string;
  completeOnArrivalAt?: LocationId;
}

export const GUIDE_PLAN: GuideStep[] = [
  { locationId: "path", hotspotId: "to-home", prompt: "Shall we start at home?", completeOnArrivalAt: "home" },
  { locationId: "home", hotspotId: "activity", prompt: "Let's put the kettle on.", completeOnActivityId: "hearth-sequence" },
  { locationId: "home", hotspotId: "to-veranda", prompt: "Come and sit on the veranda.", completeOnArrivalAt: "veranda" },
  { locationId: "veranda", hotspotId: "faces", prompt: "See who's sitting with you.", completeOnActivityId: "veranda-faces" },
  { locationId: "path", hotspotId: "to-market", prompt: "Let's walk down to the market.", completeOnArrivalAt: "market" },
  { locationId: "market", hotspotId: "identify2", prompt: "Ilo needs a hand choosing fruit.", completeOnActivityId: "market-match" },
  { locationId: "path", hotspotId: "to-garden", prompt: "The garden could use some water.", completeOnArrivalAt: "garden" },
  { locationId: "garden", hotspotId: "water-plants", prompt: "Water each row, one at a time.", completeOnActivityId: "garden-water" },
  { locationId: "path", hotspotId: "to-waterpoint", prompt: "Time to rest by the water.", completeOnArrivalAt: "waterpoint" },
];

export interface Memory {
  id: string;
  title: string;
  note: string;
  locationId: string;
  timestamp: number;
}

interface SessionState {
  guideIndex: number;
  memories: Memory[];
  lastLocation: LocationId;
  /** Hidden delights already found — kept only so they can be celebrated once. */
  foundEggs: string[];
  /** Advances after each finished activity so plaques offer something new next visit. */
  rotation: number;
  /** Story chapter cards already shown, so a chapter only opens with a title card once. */
  seenChapters: string[];
}

const STORAGE_KEY = "loom_session_v1";

function load(key: string): SessionState {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SessionState>;
      return {
        guideIndex: parsed.guideIndex ?? 0,
        memories: parsed.memories ?? [],
        lastLocation: parsed.lastLocation ?? "path",
        foundEggs: parsed.foundEggs ?? [],
        rotation: parsed.rotation ?? 0,
        seenChapters: parsed.seenChapters ?? [],
      };
    }
  } catch {
    // fall through to defaults
  }
  return { guideIndex: 0, memories: [], lastLocation: "path", foundEggs: [], rotation: 0, seenChapters: [] };
}

interface SessionContextValue {
  guideStep: GuideStep | null;
  guideIndex: number;
  memories: Memory[];
  lastLocation: LocationId;
  setLastLocation: (id: LocationId) => void;
  addMemory: (m: Omit<Memory, "id" | "timestamp">) => void;
  noteArrival: (id: LocationId) => void;
  noteActivityComplete: (activityId: string) => void;
  restartGuide: () => void;
  clearMemories: () => void;
  foundEggs: string[];
  noteEggFound: (id: string) => void;
  rotation: number;
  seenChapters: string[];
  markChapterSeen: (id: string) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { activeId } = useProfile();
  const key = scopedKey(STORAGE_KEY, activeId);
  const [state, setState] = useState<SessionState>(() => load(key));

  const loadedKeyRef = useRef(key);
  useEffect(() => {
    setState(load(scopedKey(STORAGE_KEY, activeId)));
    loadedKeyRef.current = scopedKey(STORAGE_KEY, activeId);
  }, [activeId]);

  useEffect(() => {
    if (loadedKeyRef.current !== key) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // storage unavailable — session progress just won't persist
    }
  }, [state, key]);

  const noteArrival = useCallback((id: LocationId) => {
    setState((s) => {
      const step = GUIDE_PLAN[s.guideIndex];
      const advance = step?.completeOnArrivalAt === id;
      return { ...s, lastLocation: id, guideIndex: advance ? s.guideIndex + 1 : s.guideIndex };
    });
  }, []);

  const noteActivityComplete = useCallback((activityId: string) => {
    setState((s) => {
      const step = GUIDE_PLAN[s.guideIndex];
      const advance = step?.completeOnActivityId === activityId;
      return { ...s, guideIndex: advance ? s.guideIndex + 1 : s.guideIndex, rotation: s.rotation + 1 };
    });
  }, []);

  const addMemory = useCallback((m: Omit<Memory, "id" | "timestamp">) => {
    setState((s) => ({
      ...s,
      memories: [...s.memories, { ...m, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now() }].slice(-60),
    }));
  }, []);

  const noteEggFound = useCallback((id: string) => {
    setState((s) => (s.foundEggs.includes(id) ? s : { ...s, foundEggs: [...s.foundEggs, id] }));
  }, []);

  const markChapterSeen = useCallback((id: string) => {
    setState((s) => (s.seenChapters.includes(id) ? s : { ...s, seenChapters: [...s.seenChapters, id] }));
  }, []);

  const setLastLocation = useCallback((id: LocationId) => setState((s) => ({ ...s, lastLocation: id })), []);
  const restartGuide = useCallback(() => setState((s) => ({ ...s, guideIndex: 0 })), []);
  const clearMemories = useCallback(() => setState((s) => ({ ...s, memories: [] })), []);

  const value = useMemo<SessionContextValue>(
    () => ({
      guideStep: GUIDE_PLAN[state.guideIndex] ?? null,
      guideIndex: state.guideIndex,
      memories: state.memories,
      lastLocation: state.lastLocation,
      setLastLocation,
      addMemory,
      noteArrival,
      noteActivityComplete,
      restartGuide,
      clearMemories,
      foundEggs: state.foundEggs,
      noteEggFound,
      rotation: state.rotation,
      seenChapters: state.seenChapters,
      markChapterSeen,
    }),
    [state, setLastLocation, addMemory, noteArrival, noteActivityComplete, restartGuide, clearMemories, noteEggFound, markChapterSeen],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
