import type { ReferralData } from "../../game/referral/referral";
import { personWords } from "../../game/profiles/words";
import type { TriageRow } from "../../health-worker/village";

/** The health worker's copy of the referral summary. It never includes the family's own notes. */
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
    words: personWords(person),
    homeNotes: null,
  };
}
