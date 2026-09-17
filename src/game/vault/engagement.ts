/**
 * VAULT ENGAGEMENT — which comfort content actually reaches her, read only against her own
 * average across everything in the vault. The only signals available are how long she stayed
 * with something and whether the moment carried into what came after; nothing here claims she
 * "remembered" or "recognised" anyone, only what was observed. A photo or a recording landing
 * less isn't framed as a failure — some content just doesn't land, and that's normal.
 */
import type { TelemetryEvent } from "../telemetry/store";
import type { FamilyPhoto } from "../photos/PhotoLibrary";

export type VaultItemKind = "photo" | "song" | "story" | "voice";

export interface VaultItem {
  id: string;
  kind: VaultItemKind;
  label: string;
}

export interface ItemEngagement {
  item: VaultItem;
  timesShown: number;
  avgDwellMs: number;
  /** Of the times it was shown, how often an activity followed within the next 10 minutes. */
  continuedRate: number;
  /** Of the times it was shown, how often the activity that followed finished without any help. */
  settledRate: number;
}

export interface RatedItem {
  item: VaultItem;
  phrase: string;
}

export interface CoverageGap {
  id: string;
  text: string;
  addTarget: "photos" | "voice";
}

export type VaultReading =
  | { state: "getting-to-know"; visitsSoFar: number; visitsNeeded: number; gaps: CoverageGap[] }
  | { state: "ready"; respondsTo: RatedItem[]; lessSo: RatedItem[]; gaps: CoverageGap[] };

const MIN_SHOWN = 3;
const MIN_TOTAL_VISITS = 5;
const MIN_PHOTOS = 3;
const FOLLOW_WINDOW_MS = 10 * 60_000;

const mean = (vs: number[]) => (vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : 0);

type Comfort = Extract<TelemetryEvent, { type: "comfort" }>;
type Complete = Extract<TelemetryEvent, { type: "activity_complete" }>;

function afterVisit(events: TelemetryEvent[], at: number): Complete[] {
  return events.filter(
    (e): e is Complete => e.type === "activity_complete" && e.timestamp > at && e.timestamp <= at + FOLLOW_WINDOW_MS,
  );
}

export function computeItemEngagement(events: TelemetryEvent[], catalog: VaultItem[]): ItemEngagement[] {
  const visits = events.filter((e): e is Comfort => e.type === "comfort");
  return catalog.map((item) => {
    const own = visits.filter((v) => v.itemId === item.id);
    const timesShown = own.length;
    let continued = 0;
    let settled = 0;
    for (const v of own) {
      const after = afterVisit(events, v.timestamp);
      if (after.length) {
        continued++;
        if (after.some((a) => a.cueLevelReached === 0)) settled++;
      }
    }
    return {
      item,
      timesShown,
      avgDwellMs: timesShown ? mean(own.map((v) => v.dwellMs)) : 0,
      continuedRate: timesShown ? continued / timesShown : 0,
      settledRate: timesShown ? settled / timesShown : 0,
    };
  });
}

function respondsPhrase(e: ItemEngagement, dwellRatio: number): string {
  if (e.continuedRate >= 0.8 && e.timesShown >= 3) return "settles her every time — the next activity always picks back up well";
  if (dwellRatio >= 1.6) return "holds her attention far longer than most of what's saved";
  if (dwellRatio >= 1.15) return "a longer, more settled look than most";
  return "reliably engaged with, every time it's offered";
}

function lessSoPhrase(e: ItemEngagement, dwellRatio: number): string {
  if (dwellRatio <= 0.5) return "rarely holds her attention long";
  if (e.continuedRate <= 0.2 && e.timesShown >= 3) return "shown a few times without settling her much";
  return "less engagement than most of what's saved";
}

function classify(all: ItemEngagement[]): { responds: RatedItem[]; lessSo: RatedItem[] } {
  const eligible = all.filter((e) => e.timesShown >= MIN_SHOWN);
  if (!eligible.length) return { responds: [], lessSo: [] };
  const avgDwell = mean(eligible.map((e) => e.avgDwellMs)) || 1;

  const responds: RatedItem[] = [];
  const lessSo: RatedItem[] = [];
  for (const e of eligible) {
    const dwellRatio = avgDwell ? e.avgDwellMs / avgDwell : 1;
    const score = 0.65 * dwellRatio + 0.35 * (e.continuedRate + 0.15);
    if (score >= 1.1) responds.push({ item: e.item, phrase: respondsPhrase(e, dwellRatio) });
    else if (score <= 0.75) lessSo.push({ item: e.item, phrase: lessSoPhrase(e, dwellRatio) });
  }
  return { responds, lessSo };
}

function coverageGaps(photos: FamilyPhoto[], hasVoice: boolean): CoverageGap[] {
  const out: CoverageGap[] = [];
  if (photos.length === 0) {
    out.push({
      id: "photos-none",
      text: "No family photographs saved yet. Activities that use photo recognition are relying on generic images instead of hers.",
      addTarget: "photos",
    });
  } else if (photos.length < MIN_PHOTOS) {
    out.push({
      id: "photos-few",
      text: `Only ${photos.length} family photograph${photos.length === 1 ? "" : "s"} saved. A few more would give her more of her own to recognise.`,
      addTarget: "photos",
    });
  }
  if (!hasVoice) {
    out.push({
      id: "voice-none",
      text: "No family voice recording saved yet. Adding one lets quiet moments include someone she knows, not just written words.",
      addTarget: "voice",
    });
  }
  return out;
}

/** The vault's own catalog of trackable content: every saved photo, plus the fixed comfort story, song and — if one has been recorded — the family voice message. */
export function vaultCatalog(photos: FamilyPhoto[], hasVoice: boolean): VaultItem[] {
  return [
    ...photos.map((p): VaultItem => ({ id: p.id, kind: "photo", label: p.caption?.trim() || "A family photograph" })),
    { id: "story", kind: "story", label: "The comfort story" },
    { id: "song", kind: "song", label: "The comfort song" },
    ...(hasVoice ? ([{ id: "voice", kind: "voice", label: "The family voice recording" }] as VaultItem[]) : []),
  ];
}

export function computeVaultReading(events: TelemetryEvent[], photos: FamilyPhoto[], hasVoice: boolean): VaultReading {
  const gaps = coverageGaps(photos, hasVoice);
  const visitsSoFar = events.filter((e) => e.type === "comfort").length;
  if (visitsSoFar < MIN_TOTAL_VISITS) {
    return { state: "getting-to-know", visitsSoFar, visitsNeeded: MIN_TOTAL_VISITS, gaps };
  }
  const catalog = vaultCatalog(photos, hasVoice);
  const engagement = computeItemEngagement(events, catalog);
  const { responds, lessSo } = classify(engagement);
  return { state: "ready", respondsTo: responds, lessSo, gaps };
}
