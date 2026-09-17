import { useMemo, useState } from "react";
import { usePersistentState } from "../../game/state/usePersistentState";
import { useProfile } from "../../game/profiles/ProfileContext";
import { personWords } from "../../game/profiles/words";
import { readRecordEvents } from "../../health-worker/boundary";
import {
  mondayOf,
  QUESTIONS,
  SCALE,
  shouldShowNotice,
  stretch,
  WELLBEING_KEY,
  type Checkin,
  type WellbeingState,
} from "../../game/wellbeing/checkin";
import { longDate, Page, primaryBtn, quietBtn, secondaryBtn, Section } from "../shared/ui";

const WEEK = 7 * 86_400_000;
const EMPTY: WellbeingState = { checkins: [], skippedWeeks: [], noticesSeen: [] };

/**
 * The caregiver is looked after too. Optional, skippable, never blocking and never nagging.
 * Shown beside the person's own trend on the same weeks, because seeing both together is
 * the point.
 */
export function HowAreYouPanel() {
  const [state, setState] = usePersistentState<WellbeingState>(WELLBEING_KEY, EMPTY);
  const { active, activeId } = useProfile();
  const words = personWords(active.person);
  const thisWeek = mondayOf(Date.now());
  const done = state.checkins.find((c) => c.week === thisWeek);
  const skipped = state.skippedWeeks.includes(thisWeek);
  const [answering, setAnswering] = useState(false);
  const notice = shouldShowNotice(state);

  const lead = done
    ? "Thanks for checking in this week."
    : skipped
      ? "You skipped this week, and that's fine."
      : "A short, optional check-in about you — five questions, skip any of them.";

  if (answering) {
    return (
      <CheckinForm
        initial={done}
        onCancel={() => setAnswering(false)}
        onSave={(answers) => {
          setState((s) => ({
            ...s,
            checkins: [...s.checkins.filter((c) => c.week !== thisWeek), { id: `c${Date.now().toString(36)}`, week: thisWeek, at: Date.now(), answers }],
            skippedWeeks: s.skippedWeeks.filter((w) => w !== thisWeek),
          }));
          setAnswering(false);
        }}
      />
    );
  }

  return (
    <Page
      title="How are you?"
      lead={lead}
      actions={
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setAnswering(true)} className={primaryBtn}>
            {done ? "Change this week's answers" : "Check in"}
          </button>
          {!done && !skipped && (
            <button onClick={() => setState((s) => ({ ...s, skippedWeeks: [...s.skippedWeeks, thisWeek] }))} className={secondaryBtn}>
              Skip this week
            </button>
          )}
        </div>
      }
    >
      {notice && (
        <div className="mb-6 rounded-2xl border-2 border-[#6d4a34] bg-[#fdf6e8] p-5" role="status">
          <p className="text-lg text-[#2c1e14]">
            This week sounds heavier than the last few. That happens to almost everyone caring for someone, and it's worth
            making a little room for yourself.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-base text-[#2c1e14]">
            <li>Ask your ASHA worker or the primary health centre whether there is day care or respite care nearby.</li>
            <li>Tele-MANAS, the free national mental health helpline, is there any time: call 14416.</li>
            <li>Hand one regular task to another family member — a session, a reminder, or a meal.</li>
          </ul>
          <button onClick={() => setState((s) => ({ ...s, noticesSeen: [...s.noticesSeen, notice.id] }))} className={`${secondaryBtn} mt-4`}>
            Thank you
          </button>
        </div>
      )}

      <TwoLines checkins={state.checkins} profileId={activeId} name={words.name} />

      <p className="mt-6 text-base text-[#6b563a]">
        Your answers stay on this device. They are not sent to the health worker and are not part of any referral.
      </p>
    </Page>
  );
}

function CheckinForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Checkin;
  onSave: (answers: Record<string, number>) => void;
  onCancel: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>(initial?.answers ?? {});
  return (
    <Page title="How are you?" lead="Answer what you like. There are no right answers, and any question can be left blank.">
      <div className="space-y-4">
        {QUESTIONS.map((q) => (
          <fieldset key={q.id} className="rounded-2xl border border-[#e6d3ae] bg-white p-5">
            <legend className="px-1 text-lg font-semibold text-[#2c1e14]">{q.text}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SCALE.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={answers[q.id] === i}
                  onClick={() =>
                    setAnswers((a) => {
                      const next = { ...a };
                      if (next[q.id] === i) delete next[q.id];
                      else next[q.id] = i;
                      return next;
                    })
                  }
                  className={`rounded-xl border-2 px-3 py-2 text-base ${
                    answers[q.id] === i ? "border-[#b8791f] bg-[#f6e3b8] font-semibold text-[#2c1e14]" : "border-[#e6d3ae] bg-white text-[#6b563a]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => onSave(answers)} className={primaryBtn}>
          Save
        </button>
        <button onClick={onCancel} className={quietBtn}>
          Not now
        </button>
      </div>
    </Page>
  );
}

/** Two charts on the same weeks: the person's activities, and how stretched the caregiver has felt. */
function TwoLines({ checkins, profileId, name }: { checkins: Checkin[]; profileId: string; name: string }) {
  const weeks = useMemo(() => {
    const now = mondayOf(Date.now());
    const first = Math.min(now - 7 * WEEK, ...checkins.map((c) => c.week));
    const list: number[] = [];
    for (let w = first; w <= now; w += WEEK) list.push(mondayOf(w + 3600_000 * 12));
    return [...new Set(list)].slice(-16);
  }, [checkins]);

  const personLine = useMemo(() => {
    const acts = readRecordEvents(localStorage, profileId).filter((e): e is Extract<typeof e, { kind: "activity" }> => e.kind === "activity");
    return weeks.map((w) => {
      const inWeek = acts.filter((a) => a.t >= w && a.t < w + WEEK);
      return inWeek.length ? inWeek.reduce((s, a) => s + (1 - a.cue / 4), 0) / inWeek.length : null;
    });
  }, [weeks, profileId]);

  const carerLine = weeks.map((w) => {
    const c = checkins.find((x) => x.week === w);
    return c ? stretch(c) : null;
  });

  const carerKnown = carerLine.filter((x): x is number => x !== null);
  const carerLead =
    carerKnown.length < 2
      ? "A line appears here after a couple of check-ins."
      : carerKnown[carerKnown.length - 1] > carerKnown[carerKnown.length - 2] + 0.3
        ? "Your most recent week felt more stretched than the one before."
        : carerKnown[carerKnown.length - 1] < carerKnown[carerKnown.length - 2] - 0.3
          ? "Your most recent week felt a little lighter than the one before."
          : "Your recent weeks have felt about the same.";

  return (
    <Section title={`You and ${name}, week by week`} lead={carerLead}>
      <div className="space-y-4">
        <WeekChart
          title={`${name.charAt(0).toUpperCase()}${name.slice(1)}: activities done without help`}
          top="more on own"
          bottom="more help"
          values={personLine}
          max={1}
          weeks={weeks}
          alt={`${name}'s weekly average of how independently activities were done, over ${weeks.length} weeks.`}
        />
        <WeekChart
          title="You: how stretched you've felt"
          top="more stretched"
          bottom="less stretched"
          values={carerLine}
          max={4}
          weeks={weeks}
          dashed
          alt={`How stretched you have felt each week you checked in, over the same ${weeks.length} weeks.`}
        />
      </div>
      <div className="mt-2 flex justify-between text-sm text-[#6b563a]">
        <span>Week of {longDate(weeks[0])}</span>
        <span>This week</span>
      </div>
    </Section>
  );
}

function WeekChart({
  title,
  top,
  bottom,
  values,
  max,
  weeks,
  alt,
  dashed,
}: {
  title: string;
  top: string;
  bottom: string;
  values: (number | null)[];
  max: number;
  weeks: number[];
  alt: string;
  dashed?: boolean;
}) {
  const W = 320;
  const H = 70;
  const x = (i: number) => (weeks.length < 2 ? W / 2 : (i / (weeks.length - 1)) * (W - 8) + 4);
  const y = (v: number) => (1 - v / max) * (H - 10) + 5;
  const pts = values.map((v, i) => (v === null ? null : { x: x(i), y: y(v) }));
  const path = pts.reduce((d, p, i) => (p ? `${d}${d && pts[i - 1] ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)} ` : d), "");
  return (
    <figure className="m-0">
      <figcaption className="text-base font-semibold text-[#2c1e14]">{title}</figcaption>
      <div className="mt-1 grid grid-cols-[auto_1fr] gap-2">
        <div aria-hidden className="flex flex-col justify-between text-sm text-[#6b563a]">
          <span>{top}</span>
          <span>{bottom}</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={alt} className="rounded-md border border-[#e6d3ae] bg-[#fffdf8]">
          <title>{alt}</title>
          {weeks.map((_, i) => (
            <line key={i} x1={x(i)} x2={x(i)} y1={0} y2={H} stroke="#efe3cb" strokeWidth="1" />
          ))}
          {path && <path d={path} fill="none" stroke="#2c1e14" strokeWidth="2" strokeDasharray={dashed ? "6 4" : undefined} vectorEffect="non-scaling-stroke" />}
          {pts.map((p, i) => (p ? <circle key={i} cx={p.x} cy={p.y} r="3" fill={dashed ? "#fffdf8" : "#2c1e14"} stroke="#2c1e14" strokeWidth="1.5" /> : null))}
        </svg>
      </div>
    </figure>
  );
}
