import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { TimeMode } from "../../engine/fx/DayNight";
import type { WeatherKind } from "../../engine/fx/Weather";
import { useProfile, scopedKey } from "../profiles/ProfileContext";

export interface Settings {
  /** Multiplier applied to all patient-facing text. */
  textScale: number;
  highContrast: boolean;
  reducedMotion: boolean;
  audioEnabled: boolean;
  /** Guided mode gently suggests where to go next. */
  guideMode: boolean;
  communityPackId: string;
  /** How the village clock runs: real time, a slow cycle, or pinned to one look. */
  timeMode: TimeMode;
  weather: WeatherKind;
  /** Reads prompts and dialogue aloud. */
  narration: boolean;
  /** Lets activities get gently easier or harder per cognitive domain. */
  adaptiveDifficulty: boolean;
  /** Caregiver-recorded family voice note (object URL / data URL), if any. */
  familyVoiceUrl: string | null;
  familyVoiceLabel: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  textScale: 1,
  highContrast: false,
  reducedMotion: false,
  audioEnabled: true,
  guideMode: true,
  communityPackId: "default",
  timeMode: "cycle",
  weather: "clear",
  narration: false,
  adaptiveDifficulty: true,
  familyVoiceUrl: null,
  familyVoiceLabel: null,
};

const STORAGE_KEY = "loom_settings_v1";

function load(key: string): Settings {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { activeId } = useProfile();
  const key = scopedKey(STORAGE_KEY, activeId);
  const [settings, setSettings] = useState<Settings>(() => load(key));

  // switching person swaps in that person's own settings
  useEffect(() => {
    setSettings(load(scopedKey(STORAGE_KEY, activeId)));
  }, [activeId]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(settings));
    } catch {
      // storage unavailable — settings just won't persist
    }
  }, [settings, key]);

  // respect the OS-level motion preference as the initial default
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setSettings((s) => ({ ...s, reducedMotion: true }));
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
