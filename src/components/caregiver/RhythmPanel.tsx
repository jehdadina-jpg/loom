/**
 * TIME OF DAY — Progress › Rhythm. When she tends to need more or less help, against her
 * own average only. The same 14-days-of-honesty idiom as the rest of the app: below the
 * gate, it says exactly how far along it is rather than guessing.
 */
import { useProfile } from "../../game/profiles/ProfileContext";
import { personWords } from "../../game/profiles/words";
import { readRecordEvents } from "../../health-worker/boundary";
import { computeRhythm } from "../../game/rhythm/rhythm";
import { RhythmHeatmap } from "../charts/RhythmHeatmap";
import { Page, Section } from "../shared/ui";

export function RhythmPanel() {
  const { activeId, active } = useProfile();
  const w = personWords(active.person);
  const rhythm = computeRhythm(readRecordEvents(localStorage, activeId));

  if (rhythm.state === "getting-to-know") {
    return (
      <Page title="Time of day" lead={`Still learning ${w.possessive} rhythm through the day.`}>
        <Section
          title="Still learning her rhythm"
          lead={`${rhythm.sessionsSoFar} of ${rhythm.sessionsNeeded} sessions so far, across ${rhythm.windowsSoFar} of ${rhythm.windowsNeeded} times of day.`}
        >
          <p className="text-base text-[var(--ink-soft)]">
            Once there's enough spread across the day, this page will show whether {w.name} tends to need more or less
            help at particular times — always against {w.possessive} own average, never anyone else's.
          </p>
        </Section>
      </Page>
    );
  }

  return (
    <Page title="Time of day" lead={rhythm.sentence}>
      <Section title="Through the day" lead="Five kinds of activity, four times of day, each read against her own average.">
        <RhythmHeatmap rhythm={rhythm} />
      </Section>

      {rhythm.actionable.length > 0 && (
        <div className="mt-4">
          <Section title="What this suggests" lead="Worth trying, based on her own pattern so far.">
            <ul className="space-y-2">
              {rhythm.actionable.map((a) => (
                <li key={a} className="flex items-start gap-2 text-base text-[var(--ink)]">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-shadow)]" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </Page>
  );
}
