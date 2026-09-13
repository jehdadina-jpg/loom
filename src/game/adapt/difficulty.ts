import type { CognitiveDomain } from "../../data/activities";
import type { TelemetryEvent } from "../telemetry/store";

export type DifficultyLevel = "gentle" | "standard" | "fuller";

export interface DomainProfile {
  domain: CognitiveDomain;
  level: DifficultyLevel;
  /** How many choices to show for this domain right now. */
  choiceCount: number;
  /** Cue level the activity opens on, so repeated struggle starts with help already visible. */
  startingCue: number;
  sampleSize: number;
  avgCue: number;
}

const ALL_DOMAINS: CognitiveDomain[] = ["memory", "attention", "speed", "language", "visuospatial"];

/**
 * Adapts per cognitive domain, never by diagnosis.
 *
 * The only input is how much *help* was needed last time — not how many mistakes were
 * made — so an easier round is a response to effort, not a punishment for failure.
 * With no history at all we sit in the middle rather than assuming impairment.
 */
export function profileForDomain(events: TelemetryEvent[], domain: CognitiveDomain): DomainProfile {
  const completions = events.filter(
    (e): e is Extract<TelemetryEvent, { type: "activity_complete" }> =>
      e.type === "activity_complete" && e.domain === domain,
  );
  const recent = completions.slice(-4);

  if (recent.length === 0) {
    return { domain, level: "standard", choiceCount: 4, startingCue: 0, sampleSize: 0, avgCue: 0 };
  }

  const avgCue = recent.reduce((s, c) => s + c.cueLevelReached, 0) / recent.length;

  if (avgCue >= 2.5) {
    return { domain, level: "gentle", choiceCount: 2, startingCue: 1, sampleSize: recent.length, avgCue };
  }
  if (avgCue <= 0.6 && recent.length >= 3) {
    return { domain, level: "fuller", choiceCount: 4, startingCue: 0, sampleSize: recent.length, avgCue };
  }
  return { domain, level: "standard", choiceCount: 3, startingCue: 0, sampleSize: recent.length, avgCue };
}

export function allDomainProfiles(events: TelemetryEvent[]): DomainProfile[] {
  return ALL_DOMAINS.map((d) => profileForDomain(events, d));
}

export const LEVEL_LABELS: Record<DifficultyLevel, string> = {
  gentle: "Fewer choices",
  standard: "Usual",
  fuller: "More choices",
};
