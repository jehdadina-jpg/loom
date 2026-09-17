/**
 * The referral summary — the most important thing LOOM produces. One page a primary
 * health centre doctor can act on. It carries observed change over time and the RUDAS
 * record; it never carries a conclusion.
 */
import { DOMAIN_NAMES } from "../../data/domains";
import type { RudasRecord } from "../clinical/rudas";
import { formatDay, PATTERN_WORDS, trajectorySentence, type Trajectory, type Words } from "../trajectory/trajectory";

export const REFERRAL_FOOTER =
  "LOOM does not diagnose. This is a record of observed change over time, to support a clinical conversation.";

export interface ReferralData {
  /** The family's copy may include home notes; the health worker's never does. */
  audience: "family" | "health-worker";
  generatedAt: number;
  person: { fullName: string; age: number | null; usingSince: number | null };
  rudas: Pick<RudasRecord, "date" | "total" | "administeredBy">[];
  trajectory: Trajectory;
  words: Words;
  homeNotes: string | null;
}

export function observation(d: ReferralData): string {
  return trajectorySentence(d.trajectory, d.words);
}

export function usingFor(since: number | null, now: number): string {
  if (!since) return "Not yet started";
  const days = Math.max(1, Math.round((now - since) / 86_400_000));
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 70) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

const longDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

/** Plain-text version for pasting into a message. Same content, same footer. */
export function referralText(d: ReferralData): string {
  const lines: string[] = [];
  lines.push("LOOM — summary for a clinical conversation");
  lines.push(`Prepared ${longDate(d.generatedAt)}`);
  lines.push("");
  lines.push(`Name: ${d.person.fullName}`);
  lines.push(`Age: ${d.person.age ?? "not recorded"}`);
  lines.push(`Using LOOM for: ${usingFor(d.person.usingSince, d.generatedAt)}${d.person.usingSince ? ` (since ${longDate(d.person.usingSince)})` : ""}`);
  lines.push("");
  lines.push("RUDAS");
  if (d.rudas.length === 0) lines.push("  Not taken.");
  for (const r of d.rudas) lines.push(`  ${longDate(r.date)}: ${r.total}/30 (given by ${r.administeredBy || "not recorded"})`);
  lines.push("");
  lines.push("Observation");
  lines.push(`  ${observation(d)}`);
  lines.push("");
  lines.push("Five activity domains, against this person's own first two weeks");
  if (d.trajectory.state === "getting-to-know") {
    lines.push("  Not yet available — fewer than 14 days of activity recorded.");
  } else {
    for (const dom of d.trajectory.domains) {
      const since = dom.pattern !== "stable" && dom.since ? ` since ${formatDay(dom.since)}` : "";
      lines.push(`  ${DOMAIN_NAMES[dom.domain]}: ${PATTERN_WORDS[dom.pattern]}${since}`);
    }
  }
  if (d.audience === "family") {
    lines.push("");
    lines.push("Noticed at home");
    lines.push(d.homeNotes?.trim() ? d.homeNotes.trim().replace(/^/gm, "  ") : "  No notes recorded.");
  }
  lines.push("");
  lines.push(REFERRAL_FOOTER);
  return lines.join("\n");
}
