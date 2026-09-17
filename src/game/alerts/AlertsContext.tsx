import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useProfile } from "../profiles/ProfileContext";
import { personWords } from "../profiles/words";
import { useTelemetry } from "../telemetry/store";
import { useReminders } from "../reminders/ReminderContext";
import { useSettings } from "../state/SettingsContext";
import { usePersistentState } from "../state/usePersistentState";
import { readRecordEvents } from "../../health-worker/boundary";
import { computeTrajectory, type Trajectory } from "../trajectory/trajectory";
import { allDomainProfiles, type DifficultyLevel } from "../adapt/difficulty";
import { latestRudas, RUDAS_KEY, startingBands, type RudasRecord } from "../clinical/rudas";
import type { CognitiveDomain } from "../../data/domains";
import {
  appChangedDrafts,
  referralDraft,
  reminderDrafts,
  sessionDrafts,
  type AdaptiveSnapshot,
  type AlertDraft,
} from "./derive";

export interface AlertEntry extends AlertDraft {
  raisedAt: number;
  handledAt: number | null;
}

interface AlertsContextValue {
  open: AlertEntry[];
  handled: AlertEntry[];
  acknowledge: (id: string) => void;
  /** Pins a domain back to how it was before the app changed it. */
  keepEarlier: (alert: AlertEntry) => void;
  /** Removes a caregiver pin so the app adapts on its own again. */
  letAppAdjust: (domain: string) => void;
  isPinned: (domain: string) => boolean;
  trajectory: Trajectory;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

const newestFirst = (a: AlertEntry, b: AlertEntry) => b.raisedAt - a.raisedAt;

/**
 * The ledger of everything that needed a human. Alerts are added once and never removed;
 * acknowledging one only moves it to "handled".
 */
export function AlertsProvider({ children }: { children: ReactNode }) {
  const { active, activeId } = useProfile();
  const { events } = useTelemetry();
  const { reminders, log: reminderLog } = useReminders();
  const { settings, update } = useSettings();
  const [rudas] = usePersistentState<RudasRecord[]>(RUDAS_KEY, []);
  const [ledger, setLedger] = usePersistentState<AlertEntry[]>("loom_alerts_v1", []);
  const [snapshot, setSnapshot] = usePersistentState<Record<string, AdaptiveSnapshot> | null>("loom_adaptive_snapshot_v1", null);
  const [hour, setHour] = useState(() => Math.floor(Date.now() / 3600_000));

  useEffect(() => {
    const id = window.setInterval(() => setHour(Math.floor(Date.now() / 3600_000)), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const words = useMemo(() => personWords(active.person), [active.person]);
  const trajectory = useMemo(
    () => computeTrajectory(readRecordEvents(localStorage, activeId)),
    // events changing is the signal that the record grew
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId, events, hour],
  );

  const add = useCallback(
    (drafts: AlertDraft[]) => {
      if (!drafts.length) return;
      setLedger((prev) => {
        const known = new Set(prev.map((a) => a.id));
        // one suggestion to see a doctor per fortnight; the domains involved can shift day to day
        const recentReferral = prev.some((a) => a.kind === "referral" && Date.now() - a.raisedAt < 14 * 86_400_000);
        const fresh = drafts
          .filter((d) => !known.has(d.id) && !(d.kind === "referral" && recentReferral))
          .map((d) => ({ ...d, raisedAt: d.at, handledAt: null }));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
    },
    [setLedger],
  );

  // referral suggestions, reminder escalations, session patterns
  useEffect(() => {
    const now = Date.now();
    const record = readRecordEvents(localStorage, activeId);
    const drafts = [
      referralDraft(trajectory, words, now),
      ...reminderDrafts(reminders, reminderLog, now),
      ...sessionDrafts(record, now),
    ].filter((d): d is AlertDraft => !!d);
    add(drafts);
  }, [trajectory, words, reminders, reminderLog, activeId, add, hour]);

  // "the app has changed": compare today's adaptive settings with the last ones seen
  const bands = useMemo(() => {
    const latest = latestRudas(rudas);
    return latest ? startingBands(latest) : null;
  }, [rudas]);
  const current = useMemo(() => {
    if (!settings.adaptiveDifficulty) return null;
    const profiles = allDomainProfiles(events, { bands, overrides: settings.adaptiveOverrides });
    return Object.fromEntries(
      profiles.map((p) => [
        p.domain,
        { level: p.level, idleCueMs: p.idleCueMs, levelReason: p.levelReason, timeReason: p.timeReason, fromHistory: p.sampleSize > 0 },
      ]),
    );
  }, [events, bands, settings.adaptiveDifficulty, settings.adaptiveOverrides]);

  const lastProfile = useRef(activeId);
  const lastOverrides = useRef(JSON.stringify(settings.adaptiveOverrides ?? {}));
  useEffect(() => {
    if (!current) return;
    // a profile switch loads a different person's snapshot; don't compare across people
    if (lastProfile.current !== activeId) {
      lastProfile.current = activeId;
      return;
    }
    const plain = Object.fromEntries(Object.entries(current).map(([d, v]) => [d, { level: v.level, idleCueMs: v.idleCueMs }]));
    const overrides = JSON.stringify(settings.adaptiveOverrides ?? {});
    const caregiverJustChanged = overrides !== lastOverrides.current;
    lastOverrides.current = overrides;
    // changes a caregiver made themselves aren't news to them
    if (snapshot && !caregiverJustChanged) {
      const pinnedByCaregiver = (d: string) => !!settings.adaptiveOverrides?.[d as CognitiveDomain];
      const unpinned = Object.fromEntries(Object.entries(current).filter(([d]) => !pinnedByCaregiver(d)));
      add(appChangedDrafts(snapshot, unpinned, words, Date.now()));
    }
    if (JSON.stringify(plain) !== JSON.stringify(snapshot)) setSnapshot(plain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, activeId]);

  const acknowledge = useCallback(
    (id: string) => setLedger((prev) => prev.map((a) => (a.id === id && !a.handledAt ? { ...a, handledAt: Date.now() } : a))),
    [setLedger],
  );

  const keepEarlier = useCallback(
    (alert: AlertEntry) => {
      if (!alert.change) return;
      const { domain, from, to } = alert.change;
      // pin only what this alert was about, leaving the rest free to adapt
      const existing = settings.adaptiveOverrides?.[domain as CognitiveDomain] ?? {};
      const pin = {
        ...existing,
        ...(from.level !== to.level ? { level: from.level as DifficultyLevel } : {}),
        ...(from.idleCueMs !== to.idleCueMs ? { idleCueMs: from.idleCueMs } : {}),
      };
      update({ adaptiveOverrides: { ...settings.adaptiveOverrides, [domain]: pin } });
    },
    [settings.adaptiveOverrides, update],
  );

  const letAppAdjust = useCallback(
    (domain: string) => {
      const next = { ...settings.adaptiveOverrides };
      delete next[domain as CognitiveDomain];
      update({ adaptiveOverrides: next });
    },
    [settings.adaptiveOverrides, update],
  );

  const isPinned = useCallback((domain: string) => !!settings.adaptiveOverrides?.[domain as CognitiveDomain], [settings.adaptiveOverrides]);

  const value = useMemo<AlertsContextValue>(
    () => ({
      open: ledger.filter((a) => !a.handledAt).sort(newestFirst),
      handled: ledger.filter((a) => a.handledAt).sort(newestFirst),
      acknowledge,
      keepEarlier,
      letAppAdjust,
      isPinned,
      trajectory,
    }),
    [ledger, acknowledge, keepEarlier, letAppAdjust, isPinned, trajectory],
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts(): AlertsContextValue {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertsProvider");
  return ctx;
}
