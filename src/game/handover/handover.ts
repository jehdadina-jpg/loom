/**
 * THE HANDOVER CARD — everything a sibling, a new attendant or a respite carer needs for
 * one day. Generated where the data actually supports it, and left blank or seeded with a
 * gentle starting suggestion everywhere else. The caregiver always has the last word: every
 * generated line lands in an editable box, never a fixed printout.
 */
import type { RhythmResult } from "../rhythm/rhythm";
import type { PreservedItem } from "../today/preserved";
import type { VaultReading } from "../vault/engagement";
import { describeSchedule, type Reminder } from "../reminders/model";

export const HANDOVER_AVOID_KEY = "loom_handover_avoid_v1";
export const HANDOVER_PEOPLE_KEY = "loom_handover_people_v1";
export const HANDOVER_UPSET_KEY = "loom_handover_upset_v1";
export const HANDOVER_NOTE_KEY = "loom_handover_note_v1";

export const DEFAULT_AVOID = ['Rushing her', 'Asking "do you remember"', "Loud television"].join("\n");

/** The one plain sentence for "best times" — reuses the time-of-day map's own honest gating. */
export function bestTimesText(rhythm: RhythmResult): string {
  if (rhythm.state !== "ready") return `Still learning her rhythm — ${rhythm.sessionsSoFar} of ${rhythm.sessionsNeeded} sessions so far.`;
  if (rhythm.flat || !rhythm.best) return "No strong best time yet — she's fairly even through the day.";
  return rhythm.sentence;
}

/** What she responds to: her strongest preserved skill, plus the vault's own top items. */
export function respondsToLines(preserved: PreservedItem[], vault: VaultReading): string[] {
  const lines: string[] = [];
  if (preserved.length) lines.push(preserved[0].text);
  if (vault.state === "ready") {
    for (const r of vault.respondsTo) {
      if (lines.length >= 4) break;
      lines.push(r.item.label);
    }
  }
  return lines;
}

export function medicineLines(reminders: Reminder[]): string[] {
  const meds = reminders.filter((r) => r.category === "medicine");
  if (!meds.length) return ["No medicine reminders set in LOOM."];
  return meds.map((r) => `${r.label} — ${describeSchedule(r.schedule)}`);
}

/** A starting suggestion for "if she's upset", drawn from whichever comfort content the vault shows she actually responds to. */
export function seedIfUpset(vault: VaultReading): string {
  if (vault.state === "ready") {
    const comfort = vault.respondsTo.find((r) => r.item.kind !== "photo");
    if (comfort) return `Usually ${comfort.item.label.toLowerCase()} helps, and a quiet place like the water point is often good too.`;
  }
  return "Usually music helps, and a quiet place like the water point is often good too.";
}

export interface HandoverDraft {
  bestTimes: string;
  respondsTo: string[];
  avoid: string[];
  people: string[];
  ifUpset: string;
  medicines: string[];
  oneThing: string;
}

const bulleted = (lines: string[], empty: string) => (lines.length ? lines.map((l) => `• ${l}`) : [empty]);

/** The WhatsApp-ready plain-text version — this is how a handover actually gets shared. */
export function handoverShareText(name: string, h: HandoverDraft): string {
  return [
    `Looking after ${name} — what helps`,
    "",
    "BEST TIMES",
    h.bestTimes,
    "",
    "SHE RESPONDS TO",
    ...bulleted(h.respondsTo, "Still learning."),
    "",
    "AVOID",
    ...bulleted(h.avoid, "Nothing noted yet."),
    "",
    "HER PEOPLE",
    ...bulleted(h.people, "Not filled in yet."),
    "",
    "IF SHE'S UPSET",
    h.ifUpset || "Not filled in yet.",
    "",
    "MEDICINES",
    ...bulleted(h.medicines, "No medicine reminders set in LOOM."),
    "",
    "ONE THING TO KNOW",
    h.oneThing || "Not filled in yet.",
  ].join("\n");
}
