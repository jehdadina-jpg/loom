import { useCallback } from "react";
import { useProfile } from "../profiles/ProfileContext";
import { ageFrom, personWords } from "../profiles/words";
import { usePersistentState } from "../state/usePersistentState";
import { RUDAS_KEY, type RudasRecord } from "../clinical/rudas";
import { readRecordEvents } from "../../health-worker/boundary";
import { computeTrajectory } from "../trajectory/trajectory";
import type { ReferralData } from "./referral";

/** Builds the family's copy of the referral summary, which may include their own notes. */
export function useFamilyReferral(): () => ReferralData {
  const { active, activeId } = useProfile();
  const [rudas] = usePersistentState<RudasRecord[]>(RUDAS_KEY, []);

  return useCallback(() => {
    const events = readRecordEvents(localStorage, activeId);
    const first = events.length ? Math.min(...events.map((e) => e.t)) : null;
    return {
      audience: "family",
      generatedAt: Date.now(),
      person: {
        fullName: active.person?.fullName.trim() || active.name,
        age: ageFrom(active.person?.birthYear),
        usingSince: first,
      },
      rudas: [...rudas].sort((a, b) => b.date - a.date).map(({ date, total, administeredBy }) => ({ date, total, administeredBy })),
      trajectory: computeTrajectory(events),
      words: personWords(active.person),
      homeNotes: active.notes || null,
    };
  }, [active, activeId, rudas]);
}
