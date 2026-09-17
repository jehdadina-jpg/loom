# loom-1 — Rule Audit and Fix Prompts
### Your friend's repo, checked against the six rules · 16 September 2026

---

## What this repo is

React 19 + Vite + Tailwind 4, no router library, no test framework. It is a **different and in some ways better** approach than the other repo:

**The sprites are drawn in code.** `src/engine/sprites/*.ts` is ~100KB of TypeScript that generates pixel art procedurally — terrain, structures, characters, props, nature, animals, UI. There are **no image files at all**. That solves the asset problem more completely than the tileset approach I proposed: nothing to draw, nothing to download, and recolouring per community pack is free. Keep this. It's genuinely good.

There is also a full day/night system, lighting, particles and weather, a dialogue engine, story chapters, and easter eggs. Some of that is a problem — see below.

**What is completely absent:** no `CLAUDE.md`, no tests of any kind, no CI, no IndexedDB (telemetry is localStorage capped at 400 events), no i18n, no reminders, no RUDAS, no spaced retrieval, no offline sync.

---

# Part 1 — The rule audit

## Rule 1 — No score, no timer, no streak ⚠️ mostly passing

**Good.** No countdowns, no time limits, no streaks, no XP, no leaderboards anywhere. `Dashboard.tsx:50` even says out loud: *"This is a record of support given — never a score."* That's the right instinct, written by someone who understood the brief.

**The problem is on the ASHA screen.** `AshaDashboard.tsx` renders **"Navigation deviations"** as a large bold number. That is an error count with a polite name. A health worker reading "17" has been handed a score, and if the tablet is ever visible to the patient it reads as a mark against them.

## Rule 2 — No failure state ❌ **VIOLATED**

This is the one that matters. In `ActivityOverlay.tsx`:

```ts
function handleChoiceTap(opt: ActivityOption) {
  const correct = !!opt.correct;
  log({ type: "activity_attempt", ..., correct, cueLevel, ... });
  if (correct) finish();
  else {
    audioEngine.tap();
    bumpCue();          // ← a wrong tap raises the cue level
  }
}
```

And `bumpCue()` also does `setAttempts((a) => a + 1)`.

**So a wrong tap is punished twice** — it costs a cue level and it increments a counter. The spec is explicit that only the idle timer advances cues, precisely so that tapping around costs nothing. Right now the app silently treats exploration as failure.

The pairs game is worse: a non-match waits **950ms** before resolving versus 550ms for a match (`ActivityOverlay.tsx:337`). That asymmetric pause is a "wrong" beat the person can feel, even with no red and no sound.

The code comment at line 237 says *"neither is treated as a mistake"* — the intent was right, the implementation does the opposite.

## Rule 3 — Difficulty measured by help, never errors ❌ **VIOLATED**

`store.tsx:9`:

```ts
| { type: "activity_attempt"; activityId: string; correct: boolean; cueLevel: number; ... }
```

`correct: boolean` is the exact signal the whole design excludes. It appears seven times across `ActivityOverlay.tsx`.

The second-order damage is worse than the field itself: because wrong taps bump the cue, **`cueLevelReached` is now contaminated.** It no longer means "how much help this person needed" — it means "help needed, plus how much they explored." Every downstream number, including `difficulty.ts` and every caregiver trend, is computed from a polluted measure.

## Rule 4 — Adapt on domains, never diagnosis ✅ **passes**

`difficulty.ts` is keyed to the five domains and nothing else, and the doc comment says so explicitly. No subtype or diagnosis is stored anywhere in the repo. This is correct.

It is, however, **a three-level heuristic on the last four completions** — `gentle` / `standard` / `fuller`. There is no Elo, no 85% target, no asymmetric adaptation, no hard floor, and no fluctuation guard. It works, but it is not the engine the pitch describes.

## Rule 5 — The world never shrinks ⚠️ **unverified**

No cloth band or equivalent monotonic progress marker found. `addMemory()` accumulates, which is monotonic in spirit, but nothing visibly and permanently grows per session.

## Rule 6 — Sessions are caregiver-started ❌ **missing**

No start-session flow exists. The patient opens the app and plays. This is the rule with the strongest evidence behind it — supervised training reaches SMD 0.72 on verbal memory against 0.21 unsupervised — and it is also what makes time-of-day gating demo-safe.

---

## Design-spec violations beyond the six rules

| Issue | Where | Why it matters |
|---|---|---|
| **Full night cycle** | `DayNight.ts` — midnight sky `#0b1030`, `isNight`, `lampsOn`, `starAlpha` | Spec is bright midday always. Dark scenes are actively worse for aging vision and for a population where evening agitation is the known risk |
| **Rain and mist with scene darkening** | `Weather.ts` — `gloom: 0.22` on rain | Same. Also adds moving particles across the play surface |
| **Particles and lighting during play** | `Particles.ts`, `Lighting.ts` | "Nothing animates during a choice" — motion in the periphery competes with the target, and for the Lewy body group visual noise is a hallucination risk |
| **`text-xs` (~12px) in caregiver panels** | `AshaDashboard.tsx`, `TrendsPanel.tsx` | Below the 18px floor. Defensible on a caregiver screen, but it's a habit that will leak onto patient screens |
| **Easter eggs** | `data/locations/easterEggs.ts` | Hidden content a person can fail to find is a discovery mechanic. Worth a conversation, not an automatic cut |

## Community packs — nowhere near ready

`packs.ts` is 1.3KB and holds four packs (default, Nagaland, Assam, Meghalaya). Each carries only `accent`, `accentSoft`, `villageName` and `greetingWord`.

Missing: **four of eight states** (Mizoram, Manipur, Arunachal, Tripura, Sikkim), and all of `terrain`, `house`, `motifId`, `motifVerified`, `localWordForMemory`, `audioTracks`. As it stands the pack changes a colour and a hello — every state gets the same village.

Also note `greetingWord: "Chiba"` for Nagaland: Nagaland has dozens of tribes with distinct languages. A single greeting as the state default is exactly the error the pack system exists to prevent.

---

# Part 2 — The dashboards

What exists: `Dashboard.tsx`, `TrendsPanel.tsx`, `AshaDashboard.tsx`, `SettingsPanel.tsx`, `PhotosPanel.tsx`, `PeoplePanel.tsx`, `AlbumPanel.tsx`. That's a real caregiver surface, and `trends.ts` is careful work — non-diagnostic language, a six-day minimum before flagging, honest caveats about tiredness and off days.

**What's missing:**

| Missing | Why it matters |
|---|---|
| **Reminders — medicines, hydration, daily activities, appointments** | All four are explicitly named in PS 26003. None exist |
| **Start-session control** | Rule 6, and the thing that makes a demo work at any hour |
| **RUDAS intake** | The clinical anchor. Six items, /30, ≤22 suggests assessment |
| **Alerts / referral panel with a share-with-a-doctor export** | The output of the whole trajectory system |
| **Own-baseline trajectory** | `trends.ts` splits history in half and compares. The spec is: the first 14 days are the baseline, nothing is reported before day 14, and variance is shown as a band because for a fluctuating patient the band *is* the finding |
| **Caregiver wellbeing check-in** | Caregiver collapse is the main reason home care ends |
| **Export everything / delete everything** | DPDP Act 2023, and part of "secure patient data management" in the PS |
| **Sync queue indicator** | There is no sync. localStorage capped at 400 events is not a data layer |

---

# Part 3 — Claude Code prompts

Run in order. R1 and R2 are the ones that cannot wait.

## R1 · The rules file and the failure-state bug

```
This repo is LOOM — a pixel-art cognitive stimulation app for elderly people with
dementia in Northeast India. Two tasks. Do them in order.

════ TASK 1 — Write CLAUDE.md at the repo root ════
It does not exist. It governs every future session. Put this in verbatim:

# LOOM — project rules

## The six rules — every screen, every module, every line
1. No score, no timer, no streak, no leaderboard.
2. No failure state exists anywhere in the code. Every item ends in success.
3. Difficulty is measured by how much help was needed (cue level 0-4), never by
   errors. The cue level is never shown to the patient.
4. Adaptation keys on five measured cognitive domains, never on a diagnosis.
5. The world never shrinks. Visual progress is monotonic, driven by sessions
   completed, never by performance.
6. Sessions are started by the caregiver, not the patient.

Clinical reason for rules 1-2: 45.3% irritability and 39.8% suspiciousness in the
Indian Alzheimer's population. A number that goes down reads as an accusation and
can trigger sudden agitation from perceived failure.

## Never on a patient screen
scores, points, percentages, accuracy, attempt counts, error counts, XP, levels,
stars, badges, streaks, timers, countdowns, leaderboards, confetti.

## Never, anywhere, for a wrong action
red, X marks, buzzers, shakes, "Try again", "Incorrect", error counts, or a longer
pause than a correct action gets.

## Visual rules
Every patient scene is BRIGHT MIDDAY. Never night, never dusk, never rain.
Nothing animates while a choice is open.
Patient text never below 18px. A crisp web font, never a pixel font.

## Engine boundary
No LLM touches clinical logic. The ONLY performance signal that may leave an
activity is the cue level reached (0-4). Never a boolean correct/incorrect.

════ TASK 2 — Fix the failure state ════
src/game/interactions/ActivityOverlay.tsx currently punishes a wrong tap twice:
it calls bumpCue() (raising the cue level) and increments `attempts`. The spec is
that ONLY the idle timer advances cues, so that tapping around costs nothing.

Change all three handlers — handleChoiceTap, handleSequenceTap, handleFlip:

  · A tap on a non-target must NOT call bumpCue(). It must not raise the cue
    level and must not increment attempts.
  · The only response to a wrong tap is: the correct target pulses once gently
    over ~600ms. No sound change, no message, no counter, no state change.
  · In the pairs game, a non-match must resolve in the SAME time as a match
    (currently 950ms vs 550ms). That asymmetric pause is a felt "wrong" beat.
    Use 550ms for both.
  · Keep the idle-timer cue escalation exactly as it is — that part is correct.

Then add PERSEVERATION HANDLING: if the same non-target is tapped three times
consecutively, do not repeat the current cue — emit a signal so the UI can switch
a spoken cue for a visual one. Perseveration ran at 17.9% in the frontotemporal
group.

════ TASK 3 — Remove the correct/incorrect signal ════
src/game/telemetry/store.tsx line 9 declares:
    { type: "activity_attempt"; activityId: string; correct: boolean; ... }

Replace `correct: boolean` with `wasTarget: boolean` ONLY if it is genuinely
needed for search-task analysis (omissions vs commissions in a cancellation
task). Everywhere else, delete it. No caregiver-facing or adaptation code may
read it.

Confirm afterwards that `cueLevelReached` is now a clean measure — it should mean
"how much help this person needed", uncontaminated by how much they explored.

Report what you changed before changing it.
```

## R2 · Lock the patient world to daylight

```
Patient scenes must be bright midday, always. Never night, never dusk, never rain.
Dark scenes are worse for aging vision, and evening is exactly when agitation
peaks in this population.

1. src/engine/fx/DayNight.ts — keep the module, but clamp what patient scenes can
   use. Add an exported DAYLIGHT_PHASE = 0.5 (midday) and make the world renderer
   use it unconditionally on patient routes. Keep the full cycle available behind
   a flag for the title screen or caregiver preview only.
   Remove isNight/lampsOn/starAlpha from anything a patient route can reach.

2. src/engine/fx/Weather.ts — patient routes get `clear` only. Never rain, never
   mist, never `gloom`. Keep the code, gate the usage.

3. src/engine/fx/Particles.ts and Lighting.ts — NOTHING may animate while a choice
   is open. Add an `interactionOpen` flag to the world renderer; when true, pause
   every emitter and every ambient animation. Resume when the choice resolves.
   This matters clinically: 85.7% of the Parkinson-related group in the Indian
   cohort reported hallucinations, and moving visual noise is a known trigger.

4. Raise every patient-facing font below 18px to at least 18px. Audit for
   `text-xs` and `text-sm` on patient routes.

Report each place you gated before changing it.
```

## R3 · Tests and CI — there are none

```
This repo has no test framework, no tests, and no CI. Add them.

1. Install and configure Vitest with React Testing Library, and Playwright.
   Add scripts: test, test:e2e, typecheck.

2. Write tests/contract/ enforcing the six rules, designed to FAIL THE BUILD:
   · no patient route renders a number that is not a date or a clock time
   · no engine or telemetry function returns or stores a boolean correctness value
   · a wrong tap never changes the cue level or the attempt count
   · a non-match resolves in the same time as a match
   · every activity that starts reaches a completed state — there is no path that
     ends in failure or abandonment
   · no patient route can render a night sky, rain, or mist
   · progress markers are monotonically non-decreasing across any event sequence

3. Write e2e tests that load a patient route, tap wrong targets ten times, and
   assert the cue level is unchanged and nothing visible indicates an error.

4. Add .github/workflows/ci.yml running typecheck, lint, unit and e2e.

5. Write docs/COMPLIANCE.md mapping each of the six rules to the files and tests
   that enforce it.

Prove the tests work: temporarily add an attempt counter to a patient screen,
show the suite failing, then remove it.
```

## R4 · The missing dashboard panels

```
Add the caregiver panels that do not exist. Match the existing visual style in
src/components/caregiver/. Two-column desktop layout, stacking on phones.

1. START SESSION — the highest priority.
   Rule 6: sessions are caregiver-started, never patient-started. A clear control
   in the caregiver area that begins a session and hands the device over.
   It must be able to start ANY activity at ANY hour, regardless of time-of-day
   gating on the patient side. That is what makes a demo work at 4pm.

2. REMINDERS — all four categories named in the problem statement:
   medicines · hydration · daily activities · medical appointments.
   Schedule, label, and an escalation rule: no response within 30 minutes pings
   the caregiver. Persist locally for now.

3. RUDAS INTAKE — six items with number steppers and the administration
   instruction as helper text:
   memory 0-8 · body orientation 0-5 · praxis 0-2 · drawing 0-3 ·
   judgement 0-4 · language 0-8. Total /30.
   ≤22 → "This score suggests a clinical assessment would be worthwhile.
          LOOM does not diagnose. Please share this with a doctor."
   >22 → "No immediate concern from this screen. LOOM does not diagnose."
   NEVER print a diagnosis, severity, stage or subtype anywhere in this app.

4. ALERTS — a panel collecting:
   · referral suggestions, each with a plain-language sentence and a
     "share with a doctor" export (printable)
   · reminder non-response escalations
   · "the app has changed" notices naming which setting changed and why

5. HOW ARE YOU? — a short weekly caregiver burden check-in (Zarit-style items),
   trended alongside the patient's data. Caregiver collapse is the main reason
   home care ends, so this is a first-class panel, not a footnote.

6. DATA — export everything and delete everything, both actually implemented.
   DPDP Act 2023, and part of the problem statement's "secure patient data
   management" requirement.

Every panel leads with ONE plain-language sentence, then the detail. This is read
by a tired person at 11pm.
```

## R5 · Fix the trajectory to use the person's own baseline

```
src/game/telemetry/trends.ts currently splits history in half and compares the
halves. Replace that with within-subject baselining.

1. BASELINE = the first 14 days of recorded activity, per domain.
   Report NOTHING as a trend before 14 days exist. Build an explicit
   "baseline building — 6 of 14 days" state and show it in both the caregiver
   and health-worker views.

2. After baseline, track each domain against THAT PERSON'S baseline mean and SD.
   Report variance alongside the mean, and render it as a shaded band — for a
   fluctuating patient the width of the band IS the finding, not noise to hide.

3. Detect three patterns SEPARATELY, never merged:
   GRADUAL   a sustained slope below baseline over >= 4 weeks
   STEPWISE  a change-point — a plateau then a drop. This is the vascular
             signature and must not be read as noise nor as gradual decline
   RAPID     a steep change over days rather than weeks. Escalate urgently with
             the framing "some causes of rapid cognitive change are treatable" —
             infective dementias were 5% of the Indian series and some are
             reversible

4. Add the masking check: if cue level is climbing while the domain profile holds
   steady, the adaptation is hiding a decline. Surface that explicitly.

5. OUTPUT FORMAT is a hard constraint. Every output is a referral suggestion,
   never a diagnosis:
     "Kamala's recall is 22% below her own 8-week baseline and she is needing more
      prompting. A memory clinic assessment would be worthwhile."
   Write a test asserting no output string contains: alzheimer, dementia stage,
   severe, moderate, mild cognitive impairment, diagnosis, probability, risk score.

6. In AshaDashboard.tsx, remove "Navigation deviations" as a bare bold number.
   It is an error count with a polite name. Replace it with a direction and a
   sentence, or a trend line against that person's own baseline.
```

## R6 · The eight community packs, properly

```
src/data/community/packs.ts has four packs carrying only a colour and a greeting.
Every state currently gets the same village.

1. Extend CommunityPack:
     id · state · communityLabel · terrain · house · motifId · motifVerified ·
     accent · accentSoft · localWordForMemory? · audioTrackRefs[]
   terrain: 'hills-jhum' | 'valley-paddy' | 'high-mountain' | 'plateau'
   house:   'stilt-bamboo' | 'thatch-grade' | 'stone-timber' | 'long-gabled'

2. Ship all EIGHT states: Assam, Meghalaya, Nagaland, Mizoram, Manipur,
   Arunachal Pradesh, Tripura, Sikkim — with distinct terrain, house and accent
   so the difference is obvious when switching.

3. Wire terrain and house into the procedural sprite generators in
   src/engine/sprites/. The terrain pack must change the ground and horizon; the
   house pack must change the roof silhouette. A stilt house is wrong for Sikkim
   (stone and timber) and questionable for Meghalaya.

4. Set motifVerified: false on every pack except one neutral geometric set, and
   surface "pending community review" wherever an unverified motif is used. Real
   community motifs are identity markers — some historically earned — and must
   never be invented by us or by you.

5. Remove `greetingWord: "Chiba"` as the Nagaland default. Nagaland has dozens of
   tribes with distinct languages; a single greeting as a state default is exactly
   the error this system exists to prevent. Add a community selector with a
   searchable list and a "not listed" fallback to a generic hill village.

6. Add a dev-only pack switcher so all eight can be demoed in thirty seconds.
```

## R7 · A real adaptive engine

```
src/game/adapt/difficulty.ts is a three-level heuristic over the last four
completions. It is correct in principle — domain-keyed, driven by cue level, never
by diagnosis — but it is not the engine the project claims. Replace it, keeping
the same exported interface so nothing else breaks.

Five independent skill ratings, one per domain:

  P(correct) = 1 / (1 + exp(-(theta - d)))
  theta += K * (outcome - P)
  d     -= K * (outcome - P)
  K = U(n) = a / (1 + b*n),   a = 1.0, b = 0.05

FOUR DEMENTIA-SPECIFIC MODIFICATIONS — these are the whole point:

1. TARGET 85% UNASSISTED, not the 75% educational systems use. Select items at
   d ≈ theta - ln(0.85/0.15) = theta - 1.7346.
   Target the UNASSISTED rate — the proportion resolved at cue level 0 — not a
   blended outcome where partially-cued items count as partial successes.
   Export TARGET_SUCCESS = 0.85 with a comment explaining why dementia needs a
   higher target than healthy learners.

2. ASYMMETRIC K. Difficulty falls twice as fast as it rises.
     K_down = 2.0 * U(n)   on cue level >= 2
     K_up   = 1.0 * U(n)   on cue level 0
   Map cue levels 1 and 4 to partial outcomes explicitly, with a comment
   justifying each value.

3. A HARD FLOOR. Every activity declares a floor tier: two options, maximum
   semantic distance, full cue pre-given. Selection may never go below it and
   never returns nothing for lack of an easy enough item. A session can never end
   because the person ran out of ability.

4. THE FLUCTUATION GUARD. Keep a rolling mean and SD per domain over the last 10
   sessions. A session more than 2 SD below that mean is played and stored
   normally but EXCLUDED from the theta update, flagged
   { excluded: true, reason: 'fluctuation' }, and counted toward variance instead.
   Cognitive fluctuations affect up to 90% of Lewy body patients. Variance is a
   first-class output, not noise.

Tests: convergence near 85% unassisted over 200 simulated items; a simulated
decline drops difficulty faster than a simulated improvement raises it; the floor
holds; one 3-SD-bad session leaves theta unchanged while raising variance.
```

## R8 · A real data layer

```
Telemetry is localStorage capped at 400 events (src/game/telemetry/store.tsx).
That is not enough for a 14-day baseline, and nothing syncs.

1. Move to IndexedDB via Dexie. Append-only event log, no cap that can lose the
   baseline window. Keep the existing TelemetryEvent shape where it is still
   correct.

2. The app must be FULLY FUNCTIONAL offline from a cold start, including a first
   session on day one and the entire 14-day baseline period. Low connectivity is
   an explicit requirement of the problem statement.

3. Add an append-only outbox for sync. Biomarker events are append-only and never
   conflict; player state uses last-write-wins with vector clocks.

4. Add a PWA manifest with display:standalone and a service worker precaching the
   app shell. Verify a cold start with the network genuinely off.

5. Show a sync-queue count in the caregiver view so offline capability can be
   demonstrated on stage rather than claimed.

Test with the network stubbed off for a simulated 14-day period, then reconnect
and assert nothing was lost.
```

---

# Priority

| | Prompt | Why now |
|---|---|---|
| **1** | **R1** | The failure-state bug is live, and it contaminates every measurement the project is built on |
| **2** | **R2** | Night skies and rain on a patient screen are wrong clinically and will be noticed |
| **3** | **R4** | Reminders are a named PS requirement with nothing behind them; start-session is rule 6 |
| **4** | **R3** | Without tests, R1 will regress within a week |
| **5** | R5, R6 | Before any judge sees it |
| **6** | R7, R8 | The depth that survives Q&A |

---

## One thing to tell your friend

The instincts in this repo are right. `difficulty.ts` adapts on help rather than mistakes and says so in a comment. `Dashboard.tsx` says "never a score" in the UI copy. `trends.ts` refuses to flag anything under six days and caveats tiredness and off days. `AshaDashboard.tsx` carries an explicit not-a-clinical-assessment line. Somebody read the brief and believed it.

The gap is that three of those good intentions are contradicted by the code underneath them — a wrong tap costs a cue level, `correct: boolean` is logged, and the pairs game pauses longer when you're wrong. That's what R1 fixes, and it's an hour of work, not a rewrite.
