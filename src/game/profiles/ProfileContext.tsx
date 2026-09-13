import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface Profile {
  id: string;
  name: string;
  /** Free-text notes the caregiver keeps — village they grew up in, who's who, what soothes them. */
  notes: string;
  createdAt: number;
}

interface ProfileState {
  profiles: Profile[];
  activeId: string;
}

const STORAGE_KEY = "loom_profiles_v1";

function defaultState(): ProfileState {
  const id = "p1";
  return {
    profiles: [{ id, name: "Ramal's household", notes: "", createdAt: Date.now() }],
    activeId: id,
  };
}

function load(): ProfileState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProfileState;
      if (parsed.profiles?.length) return parsed;
    }
  } catch {
    // fall through to defaults
  }
  return defaultState();
}

interface ProfileContextValue {
  profiles: Profile[];
  activeId: string;
  active: Profile;
  setActive: (id: string) => void;
  addProfile: (name: string) => void;
  renameProfile: (id: string, name: string) => void;
  setNotes: (id: string, notes: string) => void;
  removeProfile: (id: string) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProfileState>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — profiles just won't persist
    }
  }, [state]);

  const setActive = useCallback((id: string) => setState((s) => ({ ...s, activeId: id })), []);

  const addProfile = useCallback((name: string) => {
    setState((s) => {
      const id = `p${Date.now().toString(36)}`;
      return {
        profiles: [...s.profiles, { id, name: name.trim() || "New person", notes: "", createdAt: Date.now() }],
        activeId: id,
      };
    });
  }, []);

  const renameProfile = useCallback((id: string, name: string) => {
    setState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === id ? { ...p, name } : p)) }));
  }, []);

  const setNotes = useCallback((id: string, notes: string) => {
    setState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === id ? { ...p, notes } : p)) }));
  }, []);

  const removeProfile = useCallback((id: string) => {
    setState((s) => {
      if (s.profiles.length <= 1) return s;
      const profiles = s.profiles.filter((p) => p.id !== id);
      return { profiles, activeId: s.activeId === id ? profiles[0].id : s.activeId };
    });
  }, []);

  const value = useMemo<ProfileContextValue>(() => {
    const active = state.profiles.find((p) => p.id === state.activeId) ?? state.profiles[0];
    return {
      profiles: state.profiles,
      activeId: active.id,
      active,
      setActive,
      addProfile,
      renameProfile,
      setNotes,
      removeProfile,
    };
  }, [state, setActive, addProfile, renameProfile, setNotes, removeProfile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

/** Every per-person store is namespaced by profile so two people never share a record. */
export function scopedKey(base: string, profileId: string): string {
  return `${base}__${profileId}`;
}
