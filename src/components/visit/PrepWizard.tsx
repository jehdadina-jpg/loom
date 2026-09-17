/**
 * SEVEN QUESTIONS — one screen each, large type, generous spacing, always skippable.
 * Progress reads "3 of 7", never a percentage. New behaviours are listed neutrally — this
 * screen never explains what any of them might mean; that's the doctor's job.
 */
import { useState, type ReactNode } from "react";
import {
  APPETITE_LABEL,
  BEHAVIOUR_LABEL,
  FALLS_LABEL,
  MEDICINE_ISSUE_LABEL,
  MOOD_LABEL,
  SLEEP_LABEL,
  type AppetiteChange,
  type FallsAnswer,
  type MedicineIssue,
  type MoodChange,
  type NewBehaviour,
  type PrepAnswers,
  type SleepChange,
} from "../../game/visit/prep";

const STEPS = 7;

const choiceBtn = (active: boolean) =>
  `w-full rounded-[6px] border-2 px-5 py-4 text-left text-lg font-medium focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)] ${
    active
      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--parchment)]"
      : "border-[var(--parchment2)] bg-[#fffdf8] text-[var(--ink)] hover:bg-[var(--parchment2)]"
  }`;

const noteField =
  "mt-3 w-full rounded-[6px] border-2 border-[var(--parchment2)] bg-[#fffdf8] p-3 text-base text-[var(--ink)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]";

function Choice<T extends string>({ options, labels, value, onChange }: { options: T[]; labels: Record<T, string>; value: T | null; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((o) => (
        <button key={o} className={choiceBtn(value === o)} onClick={() => onChange(o)}>
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

function StepShell({
  n,
  title,
  medicines,
  children,
  onBack,
  onNext,
  onSkip,
  backLabel = "Back",
  nextLabel = "Next",
}: {
  n: number;
  title: string;
  medicines?: string[];
  children: ReactNode;
  onBack: (() => void) | null;
  onNext: () => void;
  onSkip: () => void;
  backLabel?: string;
  nextLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <p className="text-base font-medium text-[var(--ink-soft)]">Question {n} of {STEPS}</p>
      <div className="mt-1 flex gap-1.5" aria-hidden>
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < n ? "bg-[var(--accent)]" : "bg-[var(--parchment2)]"}`} />
        ))}
      </div>
      <h1 className="mt-6 text-2xl font-semibold leading-snug text-[var(--ink)]">{title}</h1>

      {medicines && (
        <div className="mt-3 rounded-[6px] border-2 border-[var(--parchment2)] bg-[var(--parchment2)] p-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Current medicines in LOOM</p>
          {medicines.length ? (
            <ul className="mt-1 space-y-1 text-base text-[var(--ink)]">
              {medicines.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-base text-[var(--ink-soft)]">None recorded in LOOM.</p>
          )}
        </div>
      )}

      <div className="mt-6">{children}</div>

      <div className="mt-8 flex flex-wrap gap-3">
        {onBack && (
          <button onClick={onBack} className="rounded-[6px] border-2 border-[var(--ink-soft)] bg-[var(--parchment)] px-5 py-3 text-lg font-semibold text-[var(--ink)] hover:bg-[var(--parchment2)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]">
            {backLabel}
          </button>
        )}
        <button onClick={onNext} className="rounded-[6px] bg-[var(--accent)] px-6 py-3 text-lg font-bold text-[var(--on-accent)] shadow-[0_3px_0_var(--accent-shadow)] hover:bg-[var(--accent-hover)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]">
          {nextLabel}
        </button>
        <button onClick={onSkip} className="ml-auto rounded-[6px] px-4 py-3 text-lg font-medium text-[var(--ink-soft)] underline underline-offset-2 hover:bg-black/5">
          Skip
        </button>
      </div>
    </div>
  );
}

export function PrepWizard({
  initial,
  medicines,
  onSave,
  onClose,
}: {
  initial: PrepAnswers;
  medicines: string[];
  onSave: (p: PrepAnswers) => void;
  onClose: () => void;
}) {
  const [p, setP] = useState<PrepAnswers>(initial);
  const [step, setStep] = useState(1);

  function save(next: PrepAnswers) {
    setP(next);
    onSave(next);
  }

  function toggleBehaviour(b: NewBehaviour) {
    save({
      ...p,
      behaviours: b === "none" ? (p.behaviours.includes("none") ? [] : ["none"]) : p.behaviours.includes(b) ? p.behaviours.filter((x) => x !== b) : [...p.behaviours.filter((x) => x !== "none"), b],
    });
  }

  const next = () => setStep((s) => Math.min(9, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  if (step === 1) {
    return (
      <StepShell n={1} title="Has her sleep changed in the last few months?" onBack={null} onNext={next} onSkip={next}>
        <Choice options={["more", "less", "awake", "same"] as SleepChange[]} labels={SLEEP_LABEL} value={p.sleep} onChange={(v) => save({ ...p, sleep: v })} />
        <textarea className={noteField} rows={2} placeholder="Anything else about her sleep (optional)" value={p.sleepNote} onChange={(e) => save({ ...p, sleepNote: e.target.value })} />
      </StepShell>
    );
  }
  if (step === 2) {
    return (
      <StepShell n={2} title="Any change in appetite or weight?" onBack={back} onNext={next} onSkip={next}>
        <Choice options={["less", "more", "losing-weight", "same"] as AppetiteChange[]} labels={APPETITE_LABEL} value={p.appetite} onChange={(v) => save({ ...p, appetite: v })} />
      </StepShell>
    );
  }
  if (step === 3) {
    return (
      <StepShell n={3} title="How has her mood been?" onBack={back} onNext={next} onSkip={next}>
        <Choice options={["withdrawn", "anxious", "irritable", "usual"] as MoodChange[]} labels={MOOD_LABEL} value={p.mood} onChange={(v) => save({ ...p, mood: v })} />
        <textarea className={noteField} rows={2} placeholder="Anything else about her mood (optional)" value={p.moodNote} onChange={(e) => save({ ...p, moodNote: e.target.value })} />
      </StepShell>
    );
  }
  if (step === 4) {
    const options: NewBehaviour[] = ["repeating-questions", "wandering", "suspicion", "hallucinations", "not-recognising", "drowsiness", "none"];
    return (
      <StepShell n={4} title="Has anything new started?" onBack={back} onNext={next} onSkip={next}>
        <p className="mb-3 text-base text-[var(--ink-soft)]">Choose as many as apply. These are things worth mentioning — not something to worry over on your own.</p>
        <div className="flex flex-col gap-3">
          {options.map((o) => (
            <button key={o} className={choiceBtn(p.behaviours.includes(o))} onClick={() => toggleBehaviour(o)}>
              {BEHAVIOUR_LABEL[o]}
            </button>
          ))}
        </div>
      </StepShell>
    );
  }
  if (step === 5) {
    return (
      <StepShell n={5} title="Any falls, or near-falls?" onBack={back} onNext={next} onSkip={next}>
        <Choice options={["yes", "no", "not-sure"] as FallsAnswer[]} labels={FALLS_LABEL} value={p.falls} onChange={(v) => save({ ...p, falls: v })} />
        <textarea className={noteField} rows={2} placeholder="Anything else about it (optional)" value={p.fallsNote} onChange={(e) => save({ ...p, fallsNote: e.target.value })} />
      </StepShell>
    );
  }
  if (step === 6) {
    return (
      <StepShell n={6} title="Any problems with her medicines?" medicines={medicines} onBack={back} onNext={next} onSkip={next}>
        <Choice options={["side-effects", "missed-doses", "hard-to-swallow", "no-problems"] as MedicineIssue[]} labels={MEDICINE_ISSUE_LABEL} value={p.medicineIssue} onChange={(v) => save({ ...p, medicineIssue: v })} />
      </StepShell>
    );
  }
  if (step === 7) {
    return (
      <StepShell n={7} title="What worries you most?" onBack={back} onNext={next} onSkip={next} nextLabel="Next">
        <p className="mb-3 text-base text-[var(--ink-soft)]">Whatever you write here goes at the very top of the report. It matters more than any chart.</p>
        <textarea
          className={noteField}
          rows={6}
          placeholder="Write as much or as little as you like."
          value={p.worries}
          onChange={(e) => save({ ...p, worries: e.target.value })}
        />
      </StepShell>
    );
  }

  // step 8: the three questions — a separate closing step, not counted in "of 7"
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <p className="text-base font-medium text-[var(--ink-soft)]">Almost done</p>
      <h1 className="mt-1 text-2xl font-semibold leading-snug text-[var(--ink)]">Three things you want to ask the doctor</h1>
      <p className="mt-2 text-base text-[var(--ink-soft)]">
        It's easy to leave an appointment having forgotten your own questions. These print at the top of the report, first.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <input
            key={i}
            className={noteField}
            placeholder={`Question ${i + 1}`}
            value={p.questions[i] ?? ""}
            onChange={(e) => {
              const questions: string[] = [...p.questions];
              questions[i] = e.target.value;
              save({ ...p, questions });
            }}
          />
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <button onClick={back} className="rounded-[6px] border-2 border-[var(--ink-soft)] bg-[var(--parchment)] px-5 py-3 text-lg font-semibold text-[var(--ink)] hover:bg-[var(--parchment2)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]">
          Back
        </button>
        <button
          onClick={onClose}
          className="rounded-[6px] bg-[var(--accent)] px-6 py-3 text-lg font-bold text-[var(--on-accent)] shadow-[0_3px_0_var(--accent-shadow)] hover:bg-[var(--accent-hover)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--focus)]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
