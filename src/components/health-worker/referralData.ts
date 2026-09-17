import type { ReferralData } from "../../game/referral/referral";
import { personWords } from "../../game/profiles/words";
import { computeRhythm } from "../../game/rhythm/rhythm";
import { computeHelpShape } from "../../game/trajectory/helpShape";
import { computeSteadiness } from "../../game/trajectory/steadiness";
import type { TriageRow } from "../../health-worker/village";

/**
 * The health worker's copy of the referral summary. It never includes the family's own
 * notes or the caregiver's own mood reads — those stay on the family's device, like the
 * rest of the vault. The time-of-day pattern travels, though: it's built from the same
 * boundary-safe activity record as the trajectory, and an afternoon drop is exactly the
 * kind of thing a doctor can't see from a clinic visit at 11am.
 */
export function healthWorkerReferral(row: TriageRow): ReferralData {
  const { person, events } = row.record;
  const rudas = events
    .filter((e): e is Extract<typeof e, { kind: "rudas" }> => e.kind === "rudas")
    .sort((a, b) => b.t - a.t)
    .map((r) => ({ date: r.t, total: r.total, administeredBy: r.administeredBy }));
  return {
    audience: "health-worker",
    generatedAt: Date.now(),
    person: { fullName: person.fullName, age: person.age, usingSince: events.length ? Math.min(...events.map((e) => e.t)) : person.enrolledAt },
    rudas,
    trajectory: row.trajectory,
    rhythm: computeRhythm(events),
    helpShape: computeHelpShape(events),
    steadiness: computeSteadiness(events),
    words: personWords(person),
    homeNotes: null,
    moodComparison: null,
  };
}
