# Caregiver & health-worker audit — findings before fixes

Recorded 17 Sep 2026, on the `dashboard` branch, after the alerts, health-worker triage, RUDAS,
"How are you?" and "Your data" panels were built and **before any audit fix was made**. Fixes and
the enforcement map are in [DASHBOARD-COMPLIANCE.md](DASHBOARD-COMPLIANCE.md).

Scope: every file under `src/components/caregiver/`, the health-worker screen
(`AshaDashboard.tsx` and `src/health-worker/`), the shared charts (`src/components/charts/`), the
referral export (`src/components/referral/`, `src/game/referral/`) and `src/routes/care/`.

## 1. Word-list grep

`grep -rniw` for score, points, percent, accuracy, correct, incorrect, wrong, error, fail,
deviation, mistake, streak, rank, better, worse, normal, abnormal — plus a substring pass to catch
camelCase names.

| File:line | Hit | Assessment |
|---|---|---|
| `Dashboard.tsx:73` | `navigationDeviations: summary.totalNavigationMisses` in the JSON export | **Violation.** A bare error count, exported under a polite name. |
| `Dashboard.tsx:53` | "…never a score." | Negation in help text. Acceptable, but reworded to avoid the word. |
| `Dashboard.tsx:101` | "…no scores, just observations." | Same. |
| `SettingsPanel.tsx:99` | text-size option labelled "Normal" | **Violation of the word list** — it implies a norm. Rename. |
| `SettingsPanel.tsx:211` | "…never on mistakes." | Negation, but frames play as having mistakes. Reword. |
| `HowAreYouPanel.tsx:79` | "a very normal part of caring" | **Word-list hit.** Kind in intent, but "normal" is on the list. Reword. |
| `PhotosPanel.tsx:9,12,59,60` | `error`, `failed` variables | Internal names; the shown text is plain ("That image couldn't be read"). No user-facing issue. |
| `RudasPanel.tsx:19,110,118,126,129,134,148,159,177` | "score(s)" | Required: RUDAS is a scored clinical instrument by specification. Kept, and only on RUDAS screens. |
| `ArchiveDocument.tsx:112`, `YourDataPanel.tsx:47` | "scores" (RUDAS item scores) | Same — RUDAS only. |
| `AshaDashboard.tsx:26`, `village.ts:15`, `DomainCharts.tsx:172,184` | "ranking/ranked" | All state that people *without* a baseline are never ranked. Acceptable. |
| `AshaDashboard.tsx:111,181` | `font-normal` | False positive (CSS class). |
| `boundary.ts:39` | `extends Error` | False positive (code). |

## 2. Bare counts of errors, misses or deviations as hero numbers

- **Violation — `Dashboard.tsx:73`**: the report export carries `navigationDeviations` as a bare number.
- `Dashboard.tsx:120–122` hero cards: "Activities completed" and "Comfort visits" are counts of things done (allowed); "Typical help needed" is words. No violation, but see §6/§7 for the chart below them.
- The old health-worker screen's "Navigation deviations" and "Sessions logged" hero numbers were **removed by the rebuild** (they no longer exist in the file).
- `AshaDashboard.tsx:142` coverage strip: counts of people enrolled / with baseline / referred — counts of things, allowed.

## 3. Gauge dials with a red zone

None. Searched for gauge, dial, needle, speedometer and canvas `arc(` — every `arc(` hit is in
the pixel-art engine (sun, lamps, icons), none on a caregiver or health-worker screen.

## 4. Clinical terms (all of `src`, including comments)

| File:line | Hit | Assessment |
|---|---|---|
| `TrendsPanel.tsx:59` | "Not a diagnosis" | **Violation** (zero hits required). |
| `game/telemetry/store.tsx:157` | "moderate to substantial assistance" — shown on the Caregiver and Health Worker observation lists | **Violation.** Reads as a severity grade. |

No hits for alzheimer, dementia stage, severe, mild cognitive impairment, probability, risk score,
cognitive decline rate or stage 1–7.

## 5. Sections that don't lead with a plain-language sentence

Checked in the running app with a DOM script (first non-heading child of every `<section>` must be a `<p>`).

- **Caregiver** — "Observations" (list first), "Support Needed Over Time" (chart first), "Cognitive Domains Practiced" (chart first), "Recent Activity" (list first).
- **Trends** — "What's changed recently" (list first). "Day by Day" has a descriptive sentence, not a finding.
- **Album** — day groups (cards first).
- **People** — profile grid, "Add someone" (form first).
- **Setup** — "Reading & comfort", "The village clock & weather", "Guidance" (controls first).
- Alerts, Reminders, How are you?, RUDAS, Health Worker, Photos, Your data: pass.

## 6. Colour as the only signal

- **Violation — `Dashboard.tsx:40` "Support Needed Over Time"**: bars are green / amber / orange by level, with the meaning only in a hover tooltip. Under a greyscale filter all bars are the same grey.
- **Violation — `Dashboard.tsx:125–135` "Observations"**: every observation gets a green dot, including ones that describe needing more help — colour that says "good" regardless of content.
- `TrendsPanel.tsx` direction dots: paired with a word badge. Pass.
- Health-worker triage dots, reminder chips, domain chart badges: all paired with words. Pass.

## 7. "Still getting to know them" before 14 days

- Health Worker list and person view: **pass** — ⚪ WAIT row, no chart, no trend, unranked.
- Caregiver Alerts: **pass** — shows the "still getting to know" note, no referral possible.
- **Violation — Caregiver "Support Needed Over Time"** (`Dashboard.tsx`): shows a per-day trend from the first day. Seen rendering with 9 days of data.
- **Violation — Trends tab** (`TrendsPanel.tsx`): "What's changed recently" flags appear after 6 days, and "Day by Day" charts from day one.

## 8. Health-worker data boundary

- `AshaDashboard.tsx` imports only: `health-worker/boundary`, `sampleVillage`, `village`, `ashaStore`, `trajectory`, `profiles/words`, `data/domains`, the referral types/view and charts, and `caregiver/ui`. None of those import photos, voice, session, settings, reminders, album or story modules. **Pass**, but only checked by reading — **no automated test enforced it yet.**
- `readEnrolledPeople` parses the whole profiles record (which contains caregiver notes) but returns only name, age, enrolment date and pronoun choice. Pass.
- The health-worker referral uses `audience: "health-worker"` and never includes home notes. Pass.
- The sync stand-in rejected a record carrying an extra field (tested: HTTP 400 "record outside boundary"). Pass.
- **Limitation, not a code defect:** the Health Worker tab sits inside the family's care console on the family's device. The boundary holds for what that screen and the sync server can reach, but a person holding the device can still open the family's tabs. A real deployment would give the health worker only the synced data.

## 9. Text below 14px on caregiver screens

Found by grep for `text-xs` / small inline sizes, confirmed with computed styles in the app:

- `Dashboard.tsx:47` chart day labels (12px), `Dashboard.tsx:205` stat-card sub-label (12px)
- `TrendsPanel.tsx:15,33,86` bar labels, day labels, direction badges (12px)
- `AlbumPanel.tsx:70` times (12px)
- `PeoplePanel.tsx:39,51` "Active" badge, "Added …" date (12px)
- `PhotosPanel.tsx:80` "Read aloud when narration is on." (12px)
- `SettingsPanel.tsx:163` option hints (12px)
- `CareRoute.tsx:47` "LOOM" wordmark in the console header (12px)

All new panels (Alerts, Reminders, How are you?, RUDAS, Health Worker, Your data, referral, charts): pass.

## 10. Charts readable without colour, with a text alternative

- Domain charts (Alerts, Health Worker, referral, archive): hatched baseline band, grey range band, solid average line, dotted change marker; `role="img"` + `aria-label` + `<title>` + a caption sentence on each. **Pass** (checked with `filter: grayscale(1)`).
- "How are you?" week charts: solid vs dashed lines, `aria-label` on each. **Pass.**
- **Violation — `Dashboard.tsx` "Support Needed Over Time"**: colour-only encoding, meaning only in `title` tooltips, no text alternative for the chart as a whole.
- **Violation — `TrendsPanel.tsx` "Day by Day"**: unlabelled bar lengths with no values and no text alternative.
- `Dashboard.tsx` "Cognitive Domains Practiced": each bar has its label and count as text. Pass.
