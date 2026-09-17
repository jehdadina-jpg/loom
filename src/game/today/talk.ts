/**
 * TALK PROMPTS — turns real session content into conversation openers, never a second test.
 * Every sentence here names something that actually happened: the activity's own static
 * content (its title, its correct answer's label — both fixed data, not invented), or who
 * she spoke with and where. Nothing about struggle ever appears here; that belongs to the
 * other panels, not to a conversation.
 */
import { getActivity } from "../../data/activities";
import { PLACE_NAMES } from "../../data/places";
import { locationForActivity } from "../../data/activities";
import { getNPC, NPCS } from "../../data/npcs";
import type { TelemetryEvent } from "../telemetry/store";
import type { SessionRecord } from "../session/history";

const LOOKBACK_MS = 3 * 86_400_000;

export interface TalkPrompt {
  id: string;
  text: string;
  at: number;
}

const COMFORT_WORDS: Record<string, string> = {
  photos: "looked through some old photographs",
  song: "listened to a song",
  story: "listened to a story",
  voice: "listened to a voice recording",
};

function easySession(r: SessionRecord): boolean {
  return r.completed && r.parts > 0 && r.partsWithoutHelp === r.parts;
}

function fromSession(r: SessionRecord): TalkPrompt | null {
  const activity = getActivity(r.activityId);
  if (!activity || !easySession(r)) return null;
  const place = PLACE_NAMES[locationForActivity(r.activityId)];

  if (activity.kind === "identify" && activity.options) {
    const answer = activity.options.find((o) => o.correct);
    if (!answer) return null;
    const isPerson = NPCS.some((n) => n.id === answer.id);
    const named = isPerson ? `named ${answer.label}` : `picked out ${answer.label.toLowerCase()}`;
    return { id: r.sessionId, at: r.startedAt, text: `Ask her about ${place} — she ${named} today, on her own.` };
  }
  if (activity.kind === "sequence") {
    return { id: r.sessionId, at: r.startedAt, text: `She got the whole ${activity.title.toLowerCase()} sequence right on her own today. Ask her about it.` };
  }
  if (activity.kind === "pairs") {
    return { id: r.sessionId, at: r.startedAt, text: `She matched every pair at ${place} today, without any help. Ask her about it.` };
  }
  if (activity.kind === "count") {
    return { id: r.sessionId, at: r.startedAt, text: `She counted correctly at ${place} today, right away. Ask her about it.` };
  }
  return null;
}

function fromDialogue(e: Extract<TelemetryEvent, { type: "dialogue" }>): TalkPrompt {
  const npc = getNPC(e.npcId);
  const place = PLACE_NAMES[e.locationId as keyof typeof PLACE_NAMES] ?? "the village";
  return { id: `dialogue-${e.timestamp}`, at: e.timestamp, text: `She spoke with ${npc.name} at ${place} today. Ask her how it went.` };
}

function fromComfort(e: Extract<TelemetryEvent, { type: "comfort" }>): TalkPrompt | null {
  const word = COMFORT_WORDS[e.contentType];
  if (!word) return null;
  const place = PLACE_NAMES[e.locationId as keyof typeof PLACE_NAMES] ?? "the water point";
  return { id: `comfort-${e.timestamp}`, at: e.timestamp, text: `She ${word} at ${place} today. Ask her about it.` };
}

/** Two or three specific, non-testing conversation openers drawn from the last few days. Empty when nothing easy has happened yet to talk about. */
export function talkAbout(records: SessionRecord[], events: TelemetryEvent[], now: number): TalkPrompt[] {
  const since = now - LOOKBACK_MS;
  const prompts: TalkPrompt[] = [];

  for (const r of records) {
    if (r.startedAt < since) continue;
    const p = fromSession(r);
    if (p) prompts.push(p);
  }
  for (const e of events) {
    if (e.timestamp < since) continue;
    if (e.type === "dialogue") prompts.push(fromDialogue(e));
    if (e.type === "comfort") {
      const p = fromComfort(e);
      if (p) prompts.push(p);
    }
  }

  prompts.sort((a, b) => b.at - a.at);
  const seen = new Set<string>();
  const unique = prompts.filter((p) => (seen.has(p.text) ? false : (seen.add(p.text), true)));
  return unique.slice(0, 3);
}
