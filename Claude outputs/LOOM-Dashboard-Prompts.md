# LOOM — Dashboard Build Prompts
### Nayu's track · caregiver + ASHA surfaces · repo: loom-1

---

## What exists already

`src/components/caregiver/` has: `Dashboard.tsx`, `TrendsPanel.tsx`, `AshaDashboard.tsx`, `SettingsPanel.tsx`, `PhotosPanel.tsx`, `PeoplePanel.tsx`, `AlbumPanel.tsx`. Data comes from `src/game/telemetry/store.tsx` (`summarizeSession`, `sessionHistory`) and `src/game/telemetry/trends.ts`.

**What's missing:** start-session, reminders, RUDAS, alerts, own-baseline trajectory, caregiver wellbeing, export/delete, and a proper ASHA triage list.

## Order

| | Prompt | Why this order |
|---|---|---|
| 1 | **D1 Start session** | Blocks the demo — without it a judge at 4pm hits dimmed tiles |
| 2 | **D2 Reminders** | Named four times in PS 26003, currently absent entirely |
| 3 | **D3 Trajectory** | The core claim, visualised |
| 4 | **D4 Alerts + referral export** | The output of D3 |
| 5 | **D5 ASHA rebuild** | The scaling story |
| 6 | **D6 RUDAS** | The clinical anchor |
| 7 | **D7 Wellbeing + data** | Completes the caregiver surface |
| 8 | **D8 Audit** | Catches what slipped |

**One dependency:** D3's 14-day baseline needs more than localStorage's 400-event cap. Either your friend lands the IndexedDB change first, or D3 ships with the baseline-building state showing honestly and the storage swap happens under it later. Don't let it block you — the UI is the same either way.

---

## House rules for every dashboard prompt

Paste this block at the top of each prompt below, or add it to `CLAUDE.md` once.

```
CAREGIVER DASHBOARD RULES

This is read by a tired person at 11pm on a phone, or by a health worker with
thirty seconds between home visits. It is NOT pixel art — normal clean web UI in
the project's warm palette, two columns on desktop, stacking on phones.

1. LEAD EVERY SECTION WITH ONE PLAIN-LANGUAGE SENTENCE, THEN THE DETAIL.
   Never make someone interpret a chart to find out whether today was fine.

2. NO GAUGE DIALS WITH RED ZONES. A needle in a red zone is a score with a
   failing grade, and it implies a population norm this system rejects. Every
   chart compares the person to their own earlier performance and nothing else.

3. NO BARE ERROR COUNTS. "Navigation deviations: 17" is a score with a polite
   name. Show a direction and a sentence, or a trend against their own baseline.

4. NEVER print a diagnosis, a subtype, a stage, a severity, or a probability —
   anywhere, in any string, including tooltips and exports. Every conclusion is
   a referral suggestion.

5. Semantic colour (good / watch / act) is separate from the brand accent and is
   never the only signal — always pair it with a word.

6. Variance is SHOWN, not smoothed away. For a fluctuating patient the width of
   the band IS the finding.

7. Nothing below 14px on caregiver screens, nothing below 18px anywhere a
   patient could see.
```

---

# D1 · Start session

```
Rule 6 of this project is that sessions are started by the caregiver, never by
the patient. There is currently no way to start one. Build it.

WHERE: a primary control in the caregiver area, above everything else on the
main dashboard. This is the most-used control in the app.

THE FLOW
  1. "Start a session" — one large primary button.
  2. It opens a short sheet:
       · which activity, or "let the app choose" (default)
       · a one-line note on why that suggestion — "morning is the best window
         for memory activities"
       · [ Hand over the device ]
  3. On confirm: navigate to the patient route and begin.

CRITICAL: the caregiver can start ANY activity at ANY hour, regardless of the
time-of-day gating that applies on the patient side. The patient sees morning
activities dimmed in the evening; the caregiver never does. This is what makes a
demo work at 4pm, and it is also the real clinical model — the caregiver decides.

ALSO ADD, on the same screen:
  · "Last session" — when, how long, which activity, and one plain sentence
    ("A steady morning. She completed four of five on her own.")
  · If no session today and it is past the usual time, a gentle line — not a
    nag, not a streak, not a guilt message. "No session yet today." and nothing
    more. Never "you missed a day", never a broken-streak indicator.

Wire it to the existing session/activity code in src/game/session/ and
src/routes/play/.
```

---

# D2 · Reminders

```
PS 26003 names four reminder categories explicitly. None exist in this repo.
Build all four.

  medicines · hydration · daily activities · medical appointments

THE PANEL — /care reminders

LIST VIEW
  Grouped by category, each row: label, schedule, next due, and today's state
  (done ✓ / due ⋯ / missed). Missed shows as a neutral dot and the word
  "missed" — never red, never an exclamation, never a count of how many.

ADD / EDIT
  · category (the four above)
  · label in free text — "the white tablet", "Bikash's blood pressure medicine".
    The family's own words, not a drug database.
  · schedule: times of day, or days of week + time
  · optional photo — a picture of the actual pill strip is more use than a name

ESCALATION
  A reminder that gets no response within 30 minutes pings the caregiver's
  device. Configurable per reminder, default on for medicines, default off for
  hydration.

ON THE PATIENT SIDE
  A reminder appears as a single large card in the patient world with one
  action: "Done". No snooze list, no dismiss-vs-skip choice, no counter.
  If it is not acted on, it simply fades after a few minutes. It never nags,
  never stacks up, and never shows how many were missed.

RESPONSE LATENCY IS A MEASURE
  Log the delay between a reminder firing and it being marked done. Drift in
  that latency over weeks is a behavioural signal — it feeds the trajectory
  work in D3. Never display it to the patient.

Persist locally alongside the existing telemetry store.
```

---

# D3 · Trajectory — rebuild on the person's own baseline

```
src/game/telemetry/trends.ts currently splits history in half and compares the
halves. Replace that with within-subject baselining. Keep the careful,
non-diagnostic tone of the existing file — that part is right.

1. BASELINE = the first 14 days of recorded activity, per domain.
   Report NOTHING as a trend before 14 days exist.
   Build an explicit state and show it prominently:
     "Still getting to know her — 6 of 14 days"
   with a short line explaining that early differences are noise, not a pattern.
   This state must be visible in BOTH the caregiver and health-worker views.

2. AFTER BASELINE: track each of the five domains against that person's own
   baseline mean and SD. Never against a population, never against other users.

3. THE CHART — five small multiples, one per domain, not one crowded chart.
   Each shows:
     · a shaded band = that person's own baseline range (mean ± 1 SD)
     · a line = recent sessions
     · an emphasised endpoint
   Variance is SHOWN, not smoothed. For a fluctuating patient the width of the
   band is the finding, not noise to hide.
   NO gauge dials. NO red zones. NO percentage-correct. NO comparison to anyone.
   Range toggle: 4 weeks · 3 months · all.

4. DETECT THREE PATTERNS SEPARATELY, never merged into one "declining" flag:

   GRADUAL   a sustained slope below baseline over >= 4 weeks
   STEPWISE  a change-point — a plateau, then a drop. This is the vascular
             signature. It must not be read as noise, and must not be read as
             gradual decline. Label it differently.
   RAPID     a steep change over days rather than weeks. Escalate urgently,
             with this exact framing: "Some causes of rapid cognitive change are
             treatable." Infective dementias were 5% of the largest Indian
             series and some are reversible — this is the one case where speed
             genuinely matters.

5. THE MASKING CHECK — if cue level is climbing while the domain profile holds
   steady, the adaptation is hiding a decline. Surface that explicitly:
     "She is holding steady, but needing more prompting to do it."
   This is a real finding and no other app shows it.

6. OUTPUT FORMAT IS A HARD CONSTRAINT. Every output is a referral suggestion,
   never a diagnosis:
     "Kamala's recall is 22% below her own 8-week baseline and she is needing
      more prompting than she was. A memory clinic assessment would be
      worthwhile."
   Write a test asserting no output string contains: alzheimer, dementia stage,
   severe, moderate, mild cognitive impairment, diagnosis, probability,
   risk score, decline rate.

7. Keep the honest caveats the current file already has — tiredness, an off day,
   a new activity, a changed device can all produce the same signal. Show them.
```

---

# D4 · Alerts and the referral export

```
Build the alerts panel — the place where everything that needs a human lands.

FOUR KINDS OF ALERT, in one list, newest first:

1. REFERRAL SUGGESTIONS (from D3)
   The plain-language sentence, the date it was raised, and which domains moved.
   Primary action: [ Share with a doctor ]

2. REMINDER ESCALATIONS (from D2)
   "Evening medicine wasn't marked done yesterday." Plain, once, not a tally.

3. SESSION PATTERNS
   Sessions abandoned partway, several days with no session, or a sharp drop in
   time spent. Neutral framing — "fewer sessions this week than usual" — never
   "engagement is down".

4. "THE APP HAS CHANGED"
   Whenever an adaptive setting changes, say so in plain words and give the
   reason: "Activities are giving her more time now, because responses have been
   slower this week." Reversible, with a caregiver override.
   This is a trust feature. An app that silently gets easier feels broken; an app
   that explains itself feels like it is paying attention.

THE REFERRAL EXPORT — the most important artefact this app produces.
A one-page printable summary a PHC doctor can act on:
  · the person's name, age, and how long they have been using LOOM
  · the RUDAS score and date, if taken (D6)
  · the five domains against their own baseline, as small charts
  · the plain-language observation, verbatim
  · what has been noticed at home — pull from caregiver notes if present
  · A CLEAR FOOTER: "LOOM does not diagnose. This is a record of observed change
    over time, to support a clinical conversation."

Make it printable (print stylesheet) and shareable (copy as text). No login
needed to read it — a doctor should not have to install anything.

Alerts can be acknowledged, which moves them to a "handled" section. They are
never deleted, and there is never an unread badge with a number on it.
```

---

# D5 · ASHA worker dashboard — rebuild

```
src/components/caregiver/AshaDashboard.tsx currently shows one person's summary
with big bold numbers. Rebuild it as a triage list for a whole village — that is
the scaling story and the reason this fits the existing NPHCE / ASHA channel
rather than inventing a new one.

THE LIST — "My village — <block>, N elders enrolled", sorted by trajectory slope:

  🔴  K. Devi        72   sharp change, 9 days      REFER
  🔴  B. Hazarika    68   below baseline 5 weeks    REFER
  🟡  R. Bora        79   drifting, watch           MONITOR
  🟡  S. Gogoi       81   high variance             MONITOR
  🟢  M. Saikia      74   stable                    CONTINUE
  ⚪  T. Phukan      70   still getting to know     WAIT  (6 of 14 days)

THE ⚪ STATE IS MANDATORY. The system refuses to triage anyone before 14 days of
data exist. No colour, no ranking, no "insufficient data" as an error — just
"still getting to know them". A system honest about what it does not yet know is
more credible than one that always has an answer.

Colour is never the only signal — every row carries a word (REFER / MONITOR /
CONTINUE / WAIT) and a short reason.

ROW CLICK → a single-person view:
  · the five domains against their own baseline (same charts as D3)
  · which domains moved and when
  · the plain-language sentence
  · [ Generate referral summary ] — the D4 export

REMOVE from every ASHA screen:
  · "Navigation deviations" as a bare bold number. It is an error count with a
    polite name. Replace with a direction and a sentence.
  · "Sessions logged" as a hero stat — that is activity, not insight.

NEVER SHOWN ON ANY ASHA SCREEN — enforce in the data layer, not just the UI:
  family photographs · voice recordings · relatives' names · vault content ·
  session content · anything from the Memory Vault.
The health worker sees a trend line and a triage colour. That boundary is the
difference between a health-system tool and a surveillance tool, and it is worth
saying out loud in the UI: a short line explaining what they can and cannot see.

Add a coverage strip for their own reporting: how many enrolled, how many with a
complete baseline, how many referred this month.
```

---

# D6 · RUDAS intake

```
Add the Rowland Universal Dementia Assessment Scale as the clinical anchor at
onboarding. It is chosen over MMSE because it is education-, gender- and
language-robust and can be administered by a health worker after brief training —
which is exactly the NER situation.

SIX ITEMS, each on its own card with a number stepper and the administration
instruction as helper text:

  Memory              0-8
  Body orientation    0-5
  Praxis              0-2
  Drawing             0-3
  Judgement           0-4
  Language            0-8
                     ─────
  Total              /30

ON COMPLETION:
  ≤ 22 → "This score suggests a clinical assessment would be worthwhile.
          LOOM does not diagnose. Please share this with a doctor or health
          worker."
  > 22 → "No immediate concern from this screen. LOOM does not diagnose."

NEVER print a diagnosis, a severity label, a stage, or a dementia subtype
anywhere in this flow or anywhere else in the app.

The score sets the starting band for the five domain profiles, so the first
session is pitched roughly right rather than starting everyone in the middle.

Store it with a date and who administered it. Allow repeat administrations and
show them as a short history — RUDAS is repeatable and a change over months is
itself worth a doctor seeing. Include it in the D4 referral export.
```

---

# D7 · Caregiver wellbeing, and data control

```
Two panels that complete the caregiver surface.

═══ HOW ARE YOU? ═══
The caregiver is a monitored subject too. Caregiver collapse is the main reason
home care ends, and no competing product tracks it.

A short weekly check-in, Zarit Burden Interview-style items, 4-6 questions:
  "Do you feel you have enough time for yourself?"
  "Do you feel stressed between caring and your other responsibilities?"
  ... on a simple 5-point scale.

Show the result as a trend alongside the patient's — same page, same time axis.
Seeing both lines together is the point.

When burden rises:
  · say so plainly and kindly, once — not every week
  · signpost practical things: respite options, a helpline, sharing tasks with
    another family member
  · never diagnose the caregiver either, and never imply they are failing

This check-in is optional and skippable, always. A caregiver too stretched to
answer a wellbeing survey is exactly the person the survey is about — do not
block anything on it, do not nag.

═══ YOUR DATA ═══
Required by DPDP Act 2023, and "secure patient data management" is a named PS
deliverable.

  · EXPORT EVERYTHING — one button, produces a readable archive: profile,
    sessions, trajectory, vault media, reminders. Not a database dump; something
    a family could actually open.
  · DELETE EVERYTHING — with a real confirmation, and it genuinely deletes,
    locally and from any sync queue.
  · WHAT IS COLLECTED — a short plain-language list. No legal boilerplate.
    Name every category, say where it is stored, say who can see it (link back
    to the ASHA boundary from D5).
  · SYNC STATUS — a live count of changes waiting to upload, and when the last
    successful sync was. This is also what lets you demo airplane mode on stage:
    turn the network off, play a session, show the queue growing, reconnect,
    watch it clear.
```

---

# D8 · Dashboard audit

```
Audit every caregiver and health-worker screen. Report findings BEFORE fixing.

1. grep every file under src/components/caregiver/ and any ASHA route for:
   score, points, percent, accuracy, correct, incorrect, wrong, error, fail,
   deviation, mistake, streak, rank, better, worse, normal, abnormal.
   List every hit with file and line.

2. No screen renders a bare count of errors, misses or deviations as a hero
   number. Every number is either a date, a duration, a count of things done, or
   a value against that person's own baseline.

3. No gauge dial with a red zone exists anywhere.

4. Search every string — including tooltips, chart labels, aria-labels, print
   styles and the referral export — for: alzheimer, dementia stage, severe,
   moderate, mild cognitive impairment, diagnosis, probability, risk score,
   cognitive decline rate, stage 1-7. There must be zero hits.

5. Every section leads with a plain-language sentence before any chart.

6. Semantic colour is never the only signal — every coloured state also carries
   a word.

7. The "still getting to know them" state renders correctly with under 14 days
   of data, in both the caregiver and ASHA views, and NO trend is shown.

8. Confirm in the data layer — not just the UI — that no ASHA route can reach
   vault media, relatives' names, or session content.

9. Nothing below 14px on caregiver screens.

10. Every chart is readable without colour (test with a greyscale filter) and
    has a text alternative.

Then write docs/DASHBOARD-COMPLIANCE.md mapping each rule to the files and tests
that enforce it.
```

---

## The two sentences that decide whether these dashboards are good

**For the caregiver:** they should be able to open it at 11pm, read one sentence, and know whether today was fine — without looking at a single chart.

**For the ASHA worker:** they should be able to open it between two home visits and know who needs a doctor — in under thirty seconds, without reading a word of clinical language.

Everything else in these prompts is in service of those two.
