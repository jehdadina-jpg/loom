import { useCallback, useEffect, useState } from "react";
import { scopedKey, useProfile } from "../profiles/ProfileContext";

const PERSISTED = "loom-persisted";

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * State saved per person on this device, following the same profile scoping as every
 * other store. Swapping profile swaps the value. The value is tagged with the key it was
 * loaded from, so one person's value can never be written under another's key. Every
 * component using the same key sees the same value.
 */
export function usePersistentState<T>(base: string, fallback: T): [T, (update: T | ((prev: T) => T)) => void] {
  const { activeId } = useProfile();
  const key = scopedKey(base, activeId);
  const [state, setState] = useState(() => ({ key, value: readStored(key, fallback) }));

  let current = state;
  if (state.key !== key) {
    current = { key, value: readStored(key, fallback) };
    setState(current);
  }

  useEffect(() => {
    const serialised = JSON.stringify(state.value);
    try {
      if (localStorage.getItem(state.key) === serialised) return;
      localStorage.setItem(state.key, serialised);
    } catch {
      // storage full or unavailable — the value lives for this visit only
      return;
    }
    window.dispatchEvent(new CustomEvent(PERSISTED, { detail: state.key }));
  }, [state]);

  // another component wrote the same key: pick it up
  useEffect(() => {
    const onPersisted = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== key) return;
      setState((s) => {
        if (s.key !== key) return s;
        const fresh = localStorage.getItem(key);
        return fresh === JSON.stringify(s.value) ? s : { key, value: readStored(key, fallback) };
      });
    };
    window.addEventListener(PERSISTED, onPersisted);
    return () => window.removeEventListener(PERSISTED, onPersisted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback((update: T | ((prev: T) => T)) => {
    setState((s) => ({ key: s.key, value: typeof update === "function" ? (update as (prev: T) => T)(s.value) : update }));
  }, []);

  return [current.value, set];
}
