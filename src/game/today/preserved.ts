/**
 * "WHAT SHE CAN STILL DO" — the panel this product leads with. Procedural memory,
 * emotional memory, remote autobiographical memory and music are preserved deep into
 * dementia; showing that is the point of the whole intervention, not a sentimental add-on.
 *
 * Every line here is derived from something that actually happened — a repeated activity,
 * a name recognised, a place found unaided — or, when there isn't enough of that yet, from
 * what the family has already put in the vault. Nothing here is a score, a percentage, or
 * framed as loss. There is no version of this panel that says "still" or "for now".
 */
import { DOMAIN_NAMES } from "../../data/domains";
import { getActivity, type ActivityDef } from "../../data/activities";
import type { TelemetryEvent } from "../telemetry/store";
import type { Trajectory } from "../trajectory/trajectory";
import type { Words } from "../trajectory/trajectory";
import type { FamilyPhoto } from "../photos/PhotoLibrary";
import type { Memory } from "../session/SessionContext";

const DAY = 86_400_000;
const WINDOW = 21 * DAY;
/** "Repeatedly" — the bar for calling something mastered rather than a lucky day. */
const MIN_REPEATS = 3;

export interface PreservedItem {
  id: string;
  text: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A natural phrase for a completed activity, by the shape of the task. */
function skillSentence(a: ActivityDef): string {
  // titles are Title Case ("Making Tea") for the village signage, but read as an ordinary
  // phrase mid-sentence here
  const name = a.title.toLowerCase();
  switch (a.kind) {
    case "sequence":
      return `Puts every step of ${name} in the right order, without help.`;
    case "pairs":
      return `Finds every match in ${name} without help, every time.`;
    case "count":
      return `Gets the count right in ${name}, every time, without help.`;
    case "identify":
    default:
      return a.domain === "language"
        ? `Names the right one in ${name} every time, without help.`
        : `Picks out the right one in ${name} every time, without help.`;
  }
}

interface Qualifying {
  activity: ActivityDef;
  timesWithoutHelp: number;
}

/** Activities completed at least MIN_REPEATS times in the window, every time without a cue. */
function qualifyingActivities(events: TelemetryEvent[], now: number): Qualifying[] {
  const byActivity = new Map<string, { zero: number; total: number }>();
  for (const e of events) {
    if (e.type !== "activity_complete" || now - e.timestamp > WINDOW) continue;
    const cur = byActivity.get(e.activityId) ?? { zero: 0, total: 0 };
    cur.total += 1;
    if (e.cueLevelReached === 0) cur.zero += 1;
    byActivity.set(e.activityId, cur);
  }
  const out: Qualifying[] = [];
  for (const [activityId, v] of byActivity) {
    if (v.total < MIN_REPEATS || v.zero !== v.total) continue;
    const activity = getActivity(activityId);
    if (activity) out.push({ activity, timesWithoutHelp: v.zero });
  }
  return out;
}

/** Named, not just matched: the specific people recognised by photograph, unaided. */
function recognisedNames(qualifying: Qualifying[]): string[] {
  const names = new Set<string>();
  for (const q of qualifying) {
    if (q.activity.kind !== "identify" || q.activity.domain !== "memory") continue;
    const target = q.activity.options?.find((o) => o.correct);
    if (target) names.add(target.label);
  }
  return [...names];
}

function join(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Domains that have held their own pattern — not declining, against her own history. */
function steadyDomainSentence(trajectory: Trajectory): PreservedItem | null {
  if (trajectory.state !== "ready") return null;
  const steady = trajectory.domains.filter((d) => d.baseline && d.pattern === "stable");
  if (steady.length === 0) return null;
  const names = steady.map((d) => DOMAIN_NAMES[d.domain].toLowerCase());
  const plural = names.length > 1;
  return {
    id: "domains-steady",
    text: `${cap(join(names))} ${plural ? "have" : "has"} stayed close to her own pattern from the start.`,
  };
}

/** Getting to places without missing a turn — a skill, not just an activity score. */
function wayfindingSentence(events: TelemetryEvent[], now: number): PreservedItem | null {
  const navs = events.filter((e): e is Extract<TelemetryEvent, { type: "navigate" }> => e.type === "navigate" && now - e.timestamp <= WINDOW);
  if (navs.length < 8) return null;
  const clean = navs.filter((n) => n.misses === 0).length;
  if (clean / navs.length < 0.8) return null;
  return { id: "wayfinding", text: "Finds her way around the village without prompting." };
}

export interface VaultContext {
  photos: FamilyPhoto[];
  memories: Memory[];
  familyVoiceLabel: string | null;
  comfortVisits: number;
}

/** Truths about her from the vault, for when the games haven't gathered enough yet. */
function vaultCandidates(v: VaultContext): PreservedItem[] {
  const out: PreservedItem[] = [];
  if (v.photos.length > 0) {
    out.push({
      id: "vault-photos",
      text: `Has ${v.photos.length} family photograph${v.photos.length === 1 ? "" : "s"} kept just for her, saved by the family.`,
    });
  }
  if (v.familyVoiceLabel) {
    out.push({ id: "vault-voice", text: `Has a voice message from ${v.familyVoiceLabel}, ready to play whenever she wants it.` });
  }
  if (v.memories.length > 0) {
    out.push({
      id: "vault-memories",
      text: `Has ${v.memories.length} moment${v.memories.length === 1 ? "" : "s"} saved in the family album, from time spent together.`,
    });
  }
  if (v.comfortVisits >= 3) {
    out.push({ id: "vault-comfort", text: "Returns often to the old song and the family voice at the water point." });
  }
  return out;
}

/**
 * The finished list. Real, derived findings lead; the vault only fills in when there isn't
 * yet enough play to speak from, or tops up a thin list — it never crowds out what she's
 * actually done.
 */
export function derivePreserved(events: TelemetryEvent[], trajectory: Trajectory, vault: VaultContext, w: Words, now = Date.now()): PreservedItem[] {
  const qualifying = qualifyingActivities(events, now);
  const names = recognisedNames(qualifying);
  const items: PreservedItem[] = [];

  if (names.length > 0) {
    items.push({ id: "faces", text: `Recognises ${join(names)} by photograph, every time.` });
  }
  for (const q of qualifying) {
    if (q.activity.kind === "identify" && q.activity.domain === "memory") continue; // folded into "faces" above
    items.push({ id: `activity-${q.activity.id}`, text: cap(skillSentence(q.activity)) });
  }

  const wayfinding = wayfindingSentence(events, now);
  if (wayfinding) items.push(wayfinding);

  const steady = steadyDomainSentence(trajectory);
  if (steady) items.push(steady);

  const vaultItems = vaultCandidates(vault);
  if (items.length === 0) {
    // never empty: what the vault already says about her, in full
    items.push(...vaultItems);
  } else if (items.length < 3 && vaultItems.length > 0) {
    items.push(vaultItems[0]);
  }

  // a truly cold profile has no play, no photos, no voice note, nothing yet — say so plainly
  // rather than showing nothing, with no hint of loss in it
  if (items.length === 0) {
    items.push({ id: "cold-start", text: `This fills in as ${w.name} plays and as photographs are added.` });
  }

  return items;
}

/** Plain text for the Share action — a message a caregiver can send straight to family. */
export function preservedShareText(items: PreservedItem[], w: Words): string {
  const who = cap(w.name);
  const lines = [`What ${who} can still do`, "", ...items.map((i) => `• ${i.text}`)];
  return lines.join("\n");
}
