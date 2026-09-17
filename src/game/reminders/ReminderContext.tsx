import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useProfile, scopedKey } from "../profiles/ProfileContext";
import { recordForHealthWorker } from "../sync/queue";
import {
  CARD_FADE_MS,
  DUE_WINDOW_MS,
  ESCALATE_AFTER_MS,
  PATIENT_CARD_WINDOW_MS,
  formatTime,
  occurrencesOn,
  type Occurrence,
  type Reminder,
  type ReminderLogEntry,
} from "./model";

// Kept next to loom_telemetry_v1, but in their own keys: the telemetry store trims to
// a few hundred events, and latency drift needs months of "done" entries.
const REMINDERS_KEY = "loom_reminders_v1";
const LOG_KEY = "loom_reminder_log_v1";
/** Housekeeping entries (fired/shown/faded/escalated) are only needed for a couple of weeks. */
const HOUSEKEEPING_DAYS = 14;
const MAX_LOG = 5000;
const TICK_MS = 15_000;

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function prune(log: ReminderLogEntry[], now: number): ReminderLogEntry[] {
  const cutoff = now - HOUSEKEEPING_DAYS * 86_400_000;
  return log.filter((e) => e.type === "done" || e.timestamp >= cutoff).slice(-MAX_LOG);
}

/** The occurrences that can still matter right now: yesterday's late ones and today's. */
function liveOccurrences(reminders: Reminder[], now: number): Occurrence[] {
  const d = new Date(now);
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const yesterday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return reminders.flatMap((r) => [...occurrencesOn(r, yesterday), ...occurrencesOn(r, today)]);
}

async function notifyCaregiver(body: string, tag: string) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification("LOOM reminder", { body, tag, icon: "/icon.svg" });
    else new Notification("LOOM reminder", { body, tag, icon: "/icon.svg" });
  } catch {
    // a notification is a courtesy; the Reminders panel still shows what's waiting
  }
}

export type NotificationStatus = "unsupported" | "default" | "granted" | "denied";

function notificationStatus(): NotificationStatus {
  return "Notification" in window ? Notification.permission : "unsupported";
}

interface ReminderContextValue {
  reminders: Reminder[];
  log: ReminderLogEntry[];
  /** Refreshed on a short tick so due/missed states stay current without a reload. */
  now: number;
  saveReminder: (r: Omit<Reminder, "id" | "createdAt"> & { id?: string }) => void;
  removeReminder: (id: string) => void;
  markDone: (o: Occurrence, by: "patient" | "caregiver") => void;
  /** The one card the patient side should show right now, if any. */
  patientCard: Occurrence | null;
  markShown: (o: Occurrence) => void;
  markFaded: (o: Occurrence) => void;
  notifications: NotificationStatus;
  requestNotifications: () => void;
  storageError: string | null;
}

const ReminderContext = createContext<ReminderContextValue | null>(null);

export function ReminderProvider({ children }: { children: ReactNode }) {
  const { activeId } = useProfile();
  const remindersKey = scopedKey(REMINDERS_KEY, activeId);
  const logKey = scopedKey(LOG_KEY, activeId);

  const [reminders, setReminders] = useState<Reminder[]>(() => loadJson(remindersKey, []));
  const [log, setLog] = useState<ReminderLogEntry[]>(() => loadJson(logKey, []));
  const [now, setNow] = useState(() => Date.now());
  const [notifications, setNotifications] = useState<NotificationStatus>(notificationStatus);
  const [storageError, setStorageError] = useState<string | null>(null);

  const loadedFor = useRef(activeId);
  useEffect(() => {
    setReminders(loadJson(scopedKey(REMINDERS_KEY, activeId), []));
    setLog(loadJson(scopedKey(LOG_KEY, activeId), []));
    loadedFor.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (loadedFor.current !== activeId) return;
    try {
      localStorage.setItem(remindersKey, JSON.stringify(reminders));
      setStorageError(null);
    } catch {
      setStorageError("This device is out of storage space. Try removing a reminder photo or a family photo.");
    }
  }, [reminders, remindersKey, activeId]);

  useEffect(() => {
    if (loadedFor.current !== activeId) return;
    try {
      localStorage.setItem(logKey, JSON.stringify(log));
    } catch {
      // the reminders themselves still work; only the history stops growing
    }
  }, [log, logKey, activeId]);

  /** Adds entries, skipping any (type, key) already recorded — ticks and effects may repeat. */
  const append = useCallback((entries: ReminderLogEntry[]) => {
    if (!entries.length) return;
    setLog((prev) => {
      const seen = new Set(prev.map((e) => `${e.type}|${e.key}`));
      const fresh = entries.filter((e) => !seen.has(`${e.type}|${e.key}`));
      return fresh.length ? prune([...prev, ...fresh], Date.now()) : prev;
    });
  }, []);

  const remindersRef = useRef(reminders);
  const logRef = useRef(log);
  useEffect(() => {
    remindersRef.current = reminders;
    logRef.current = log;
  }, [reminders, log]);
  const notified = useRef(new Set<string>());

  // The scheduler: fire what has come due, fade cards that have sat long enough, and
  // escalate to the caregiver when nothing has happened for half an hour.
  const tick = useCallback(() => {
    const t = Date.now();
    setNow(t);
    const current = logRef.current;
    const has = (type: ReminderLogEntry["type"], key: string) => current.find((e) => e.type === type && e.key === key);
    const add: ReminderLogEntry[] = [];

    for (const o of liveOccurrences(remindersRef.current, t)) {
      const { key, reminder, scheduledFor } = o;
      if (scheduledFor > t || has("done", key)) continue;

      const fired = has("fired", key);
      if (!fired) {
        if (t - scheduledFor < DUE_WINDOW_MS) {
          add.push({ type: "fired", key, reminderId: reminder.id, category: reminder.category, scheduledFor, timestamp: t });
        }
        continue;
      }

      const shown = has("shown", key);
      if (shown && !has("faded", key) && t - shown.timestamp >= CARD_FADE_MS) {
        add.push({ type: "faded", key, reminderId: reminder.id, timestamp: shown.timestamp + CARD_FADE_MS });
      }

      // only while the ping is still timely — reopening the app tomorrow shouldn't ping about today
      const waited = t - fired.timestamp;
      if (reminder.escalate && !has("escalated", key) && waited >= ESCALATE_AFTER_MS && waited < 2 * ESCALATE_AFTER_MS) {
        add.push({ type: "escalated", key, reminderId: reminder.id, timestamp: t });
        if (!notified.current.has(key)) {
          notified.current.add(key);
          void notifyCaregiver(`No response yet: ${reminder.label} (${formatTime(scheduledFor)}).`, key);
        }
      }
    }
    append(add);
  }, [append]);

  useEffect(() => {
    tick();
    const id = window.setInterval(tick, TICK_MS);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tick]);

  // pick up a reminder added for a time that has already passed without waiting a tick
  useEffect(() => {
    tick();
  }, [reminders, tick]);

  const saveReminder = useCallback((r: Omit<Reminder, "id" | "createdAt"> & { id?: string }) => {
    setReminders((prev) => {
      if (r.id && prev.some((x) => x.id === r.id)) return prev.map((x) => (x.id === r.id ? { ...x, ...r, id: x.id } : x));
      return [...prev, { ...r, id: `r${Date.now().toString(36)}`, createdAt: Date.now() }];
    });
  }, []);

  const removeReminder = useCallback((id: string) => setReminders((prev) => prev.filter((r) => r.id !== id)), []);

  const markDone = useCallback(
    (o: Occurrence, by: "patient" | "caregiver") => {
      const t = Date.now();
      const shown = logRef.current.find((e) => e.type === "shown" && e.key === o.key);
      const already = logRef.current.some((e) => e.type === "done" && e.key === o.key);
      // only the category and the delay go to the health-worker record — never the family's label
      if (by === "patient" && shown && !already) {
        recordForHealthWorker(activeId, { kind: "reminder_done", t, category: o.reminder.category, latencyMs: t - shown.timestamp });
      }
      append([
        {
          type: "done",
          key: o.key,
          reminderId: o.reminder.id,
          category: o.reminder.category,
          by,
          latencyMs: by === "patient" && shown ? t - shown.timestamp : null,
          timestamp: t,
        },
      ]);
    },
    [append, activeId],
  );

  const markShown = useCallback(
    (o: Occurrence) => append([{ type: "shown", key: o.key, reminderId: o.reminder.id, timestamp: Date.now() }]),
    [append],
  );
  const markFaded = useCallback(
    (o: Occurrence) => append([{ type: "faded", key: o.key, reminderId: o.reminder.id, timestamp: Date.now() }]),
    [append],
  );

  const requestNotifications = useCallback(() => {
    if (!("Notification" in window)) return;
    void Notification.requestPermission().then(() => setNotifications(notificationStatus()));
  }, []);

  const patientCard = useMemo(() => {
    const candidates = liveOccurrences(reminders, now).filter((o) => {
      const is = (type: ReminderLogEntry["type"]) => log.some((e) => e.type === type && e.key === o.key);
      if (o.scheduledFor > now || now - o.scheduledFor >= PATIENT_CARD_WINDOW_MS) return false;
      return is("fired") && !is("done") && !is("faded");
    });
    return candidates.sort((a, b) => a.scheduledFor - b.scheduledFor)[0] ?? null;
  }, [reminders, log, now]);

  const value = useMemo<ReminderContextValue>(
    () => ({
      reminders,
      log,
      now,
      saveReminder,
      removeReminder,
      markDone,
      patientCard,
      markShown,
      markFaded,
      notifications,
      requestNotifications,
      storageError,
    }),
    [reminders, log, now, saveReminder, removeReminder, markDone, patientCard, markShown, markFaded, notifications, requestNotifications, storageError],
  );

  return <ReminderContext.Provider value={value}>{children}</ReminderContext.Provider>;
}

export function useReminders(): ReminderContextValue {
  const ctx = useContext(ReminderContext);
  if (!ctx) throw new Error("useReminders must be used within ReminderProvider");
  return ctx;
}
