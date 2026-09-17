import type { CognitiveDomain } from "../../data/domains";
import { DOMAINS } from "../../data/domains";
import type { TelemetryEvent } from "../telemetry/store";
import type { StartingBand } from "../clinical/rudas";

export type DifficultyLevel = "gentle" | "standard" | "fuller";

export interface DomainOverride {
  level?: DifficultyLevel;
  idleCueMs?: number;
}

export interface DomainProfile {
  domain: CognitiveDomain;
  level: DifficultyLevel;
  /** How many choices to show for this domain right now. */
  choiceCount: number;
  /** Cue level the activity opens on, so repeated struggle starts with help already visible. */
  startingCue: number;
  /** How long a quiet moment lasts before a hint is offered. */
  idleCueMs: number;
  sampleSize: number;
  avgCue: number;
  /** Why the level is what it is, in words a caregiver can read. */
  levelReason: string;
  timeReason: string;
  overridden: boolean;
}

export const DEFAULT_IDLE_CUE_MS = 9000;

const LEVEL_SHAPE: Record<DifficultyLevel, { choiceCount: number; startingCue: number }> = {
  gentle: { choiceCount: 2, startingCue: 1 },
  standard: { choiceCount: 3, startingCue: 0 },
  fuller: { choiceCount: 4, startingCue: 0 },
};

type Completion = Extract<TelemetryEvent, { type: "activity_complete" }>;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

export interface ProfileOptions {
  /** Starting band from the latest RUDAS, used only until this domain has history. */
  startingBand?: StartingBand | null;
  override?: DomainOverride | null;
  now?: number;
}

/**
 * Adapts per cognitive domain from how much *help* was needed — not how many mistakes were
 * made — so an easier round is a response to effort, not a punishment for failure. With no
 * history it starts from the RUDAS band if there is one, otherwise in the middle.
 */
export function profileForDomain(events: TelemetryEvent[], domain: CognitiveDomain, opts: ProfileOptions = {}): DomainProfile {
  const now = opts.now ?? Date.now();
  const completions = events.filter((e): e is Completion => e.type === "activity_complete" && e.domain === domain);
  const recent = completions.slice(-4);
  const avgCue = recent.length ? recent.reduce((s, c) => s + c.cueLevelReached, 0) / recent.length : 0;

  let level: DifficultyLevel;
  let levelReason: string;
  let choiceCount: number;
  if (recent.length === 0) {
    if (opts.startingBand) {
      level = opts.startingBand;
      levelReason = "the starting point was set from the RUDAS check-up";
      choiceCount = LEVEL_SHAPE[level].choiceCount;
    } else {
      level = "standard";
      levelReason = "there is no history yet, so it starts in the middle";
      choiceCount = 4;
    }
  } else if (avgCue >= 2.5) {
    level = "gentle";
    levelReason = "the last few needed more help";
    choiceCount = LEVEL_SHAPE.gentle.choiceCount;
  } else if (avgCue <= 0.6 && recent.length >= 3) {
    level = "fuller";
    levelReason = "the last few were done with little help";
    choiceCount = LEVEL_SHAPE.fuller.choiceCount;
  } else {
    level = "standard";
    levelReason = "recent ones have needed a steady amount of help";
    choiceCount = LEVEL_SHAPE.standard.choiceCount;
  }

  // response time against their own earlier pace in this domain
  const weekAgo = now - 7 * 86_400_000;
  const thisWeek = completions.filter((c) => c.timestamp >= weekAgo).map((c) => c.elapsedMs / Math.max(1, c.attempts));
  const before = completions.filter((c) => c.timestamp < weekAgo).map((c) => c.elapsedMs / Math.max(1, c.attempts));
  let idleCueMs = DEFAULT_IDLE_CUE_MS;
  let timeReason = "responses are at their usual pace";
  if (thisWeek.length >= 3 && before.length >= 4) {
    const ratio = median(thisWeek) / Math.max(1, median(before));
    if (ratio >= 1.8) {
      idleCueMs = 18000;
      timeReason = "responses have been much slower this week";
    } else if (ratio >= 1.4) {
      idleCueMs = 14000;
      timeReason = "responses have been slower this week";
    }
  }

  const o = opts.override;
  if (o?.level) {
    level = o.level;
    choiceCount = LEVEL_SHAPE[o.level].choiceCount;
    levelReason = "a caregiver chose this setting";
  }
  if (o?.idleCueMs) {
    idleCueMs = o.idleCueMs;
    timeReason = "a caregiver chose this setting";
  }

  return {
    domain,
    level,
    choiceCount,
    startingCue: LEVEL_SHAPE[level].startingCue,
    idleCueMs,
    sampleSize: recent.length,
    avgCue,
    levelReason,
    timeReason,
    overridden: !!(o?.level || o?.idleCueMs),
  };
}

export function allDomainProfiles(
  events: TelemetryEvent[],
  opts: { bands?: Record<CognitiveDomain, StartingBand> | null; overrides?: Partial<Record<CognitiveDomain, DomainOverride>> } = {},
): DomainProfile[] {
  return DOMAINS.map((d) =>
    profileForDomain(events, d, { startingBand: opts.bands?.[d] ?? null, override: opts.overrides?.[d] ?? null }),
  );
}

export const LEVEL_LABELS: Record<DifficultyLevel, string> = {
  gentle: "Fewer choices",
  standard: "Usual choices",
  fuller: "More choices",
};
