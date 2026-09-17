# Dashboard compliance

How each caregiver and health-worker rule is enforced: by which code, and by which test or check.
Run the automated checks with `npm test`. What the audit found before fixes is in
[AUDIT-FINDINGS.md](AUDIT-FINDINGS.md).

**Legend** — **Test**: fails the suite if broken. **Code**: enforced by how the code is built, and
reviewed. **Manual**: a repeatable in-browser check (script at the bottom); not yet automated.

---

## The seven caregiver-dashboard rules

### 1. Lead every section with one plain-language sentence, then the detail

| Where | How |
|---|---|
| `src/components/shared/ui.tsx` — `Page`, `Section` | **Code.** Both take a required `lead` string, rendered as a `<p>` straight after the heading. Every panel built since uses them (Alerts, Reminders, How are you?, RUDAS, Health Worker, Your data). |
| `TodayScreen.tsx` (every card opens with a sentence), `TrendsPanel.tsx`, `AlbumPanel.tsx`, `PeoplePanel.tsx`, `SettingsPanel.tsx` | **Code.** Older screens were given lead sentences in the audit fix. |
| `game/trajectory/trajectory.ts` — `trajectorySentence` | **Code.** The one sentence used on every trend view and the referral. |
| All caregiver tabs | **Manual** — section-lead check (script A). Passed on all twelve tabs after fixes. |

### 2. No gauge dials; every chart compares the person only with their own earlier performance

| Where | How |
|---|---|
| `game/trajectory/trajectory.ts` | **Code.** The baseline is the person's own first 14 days (`BASELINE_DAYS`). There are no population constants in the file. |
| `components/charts/DomainCharts.tsx` | **Code.** Each chart draws that person's own baseline band. |
| `tests/language.test.ts` — "has no gauge or dial components" | **Test.** |
| `tests/trajectory.test.ts` — sample-village triage | **Test.** Triage comes only from each person's record against their own baseline. |

### 3. No bare error counts

| Where | How |
|---|---|
| `TodayScreen.tsx` | **Code.** The old stat-tile row and the JSON report export are gone. The same facts appear as plain lines in the Today column; the full export is Setup › Your data. |
| `components/health-worker/VillageTab.tsx`, `PersonPanel.tsx` | **Code.** The old wayfinding and session-total hero numbers are gone. In their place, `health-worker/village.ts` `sessionDirection` and `wayfindingDirection` give a direction and a sentence against the person's own earlier weeks. The only numbers are counts of people (coverage) and ages. **Test:** `tests/today.test.ts` "health-worker directions replace the old hero numbers"; `tests/asha-route.test.tsx` checks the old labels never render. |
| `tests/language.test.ts` — "never names deviations, misses, mistakes, accuracy, percentages or streaks" | **Test**, over every caregiver, chart, referral, health-worker and care-route file. |

### 4. Never a diagnosis, subtype, stage, severity or probability — anywhere

| Where | How |
|---|---|
| `tests/language.test.ts` — "has zero hits in any source file" | **Test** over all of `src/` (strings, JSX, aria-labels, tooltips, print CSS, export code, comments): alzheimer, dementia stage, severe, moderate, mild cognitive impairment, diagnosis, probability, risk score, cognitive decline rate, stage 1–7. |
| `tests/trajectory.test.ts` — "describes change in plain words…" | **Test.** Generated trajectory sentences contain none of those words. |
| `game/clinical/rudas.ts` — `rudasMessage` | **Code + Test** (`tests/rules.test.ts`). Only the two specified messages exist. |
| `game/referral/referral.ts` — `REFERRAL_FOOTER` | **Test** (`tests/referral.test.tsx`). The footer is asserted verbatim in both the page and the copy-as-text version. |
| Every conclusion is a referral suggestion | **Code.** The strongest thing `trajectorySentence` says is "It would be worth sharing this with a doctor." |

### 5. Semantic colour is separate from the brand accent and never the only signal

| Where | How |
|---|---|
| `components/health-worker/triage.tsx` — `TriageMark` | **Code.** Dot plus REFER / MONITOR / CONTINUE / WAIT, plus a reason on every row. WAIT has no fill colour. |
| `RemindersPanel.tsx` — `STATE_STYLE` | **Code.** ✓ done / ⋯ due / ● missed, each with its word; missed is neutral grey. |
| `TrendsPanel.tsx`, `DomainCharts.tsx` | **Code.** Badges carry words; charts use no colour to encode meaning. |
| `TodayScreen.tsx` | **Code.** Today column marks are symbols with words (done / due / later / missed / set aside), never colour. |
| Greyscale | **Manual** — script C. |

### 6. Variance is shown, not smoothed away

| Where | How |
|---|---|
| `trajectory.ts` — `rolling` (7-day low/mean/high), `high-variance` pattern | **Code.** A wider spread is a finding (MONITOR, "more ups and downs than usual"). |
| `DomainCharts.tsx` | **Code.** Draws the low–high band, not just the mean. |
| `reminders/latency.ts` | **Code.** Weekly p25 and p75 kept beside the median. |
| `tests/trajectory.test.ts` | **Test.** The fluctuating sample person is triaged MONITOR for variance. |

### 7. Nothing below 14px on caregiver screens; nothing below 18px where a patient could see

| Where | How |
|---|---|
| `tests/language.test.ts` — "uses nothing below 14px" | **Test.** Fails on `text-xs`, `text-[<14px]`, inline `fontSize` < 14 or CSS `font-size` < 14px in caregiver, health-worker, chart, referral and care-route files. |
| Chart labels | **Code.** Axis words are HTML beside the SVG, so they don't scale down with it. |
| `game/reminders/ReminderCard.tsx` (patient side) | **Code.** 20 / 28 / 26px, multiplied by the text-size setting. |
| Computed sizes | **Manual** — script B. Passed on every tab and the console header after fixes. |

---

## The ten audit checks

| # | Check | Enforced by |
|---|---|---|
| 1 | Word-list grep on caregiver and health-worker files | `tests/language.test.ts` (deviation, misses, mistake, accuracy, percent, streak, incorrect; normal/abnormal as a word). "score" is still allowed on the RUDAS screens because RUDAS is a scored instrument by specification. |
| 2 | No bare error count as a hero number | `tests/language.test.ts`; `TodayScreen.tsx` and the health-worker `VillageTab.tsx` / `PersonPanel.tsx` code (above). |
| 3 | No gauge with a red zone | `tests/language.test.ts` — gauge / speedometer / needle. |
| 4 | Zero clinical-label hits in any string | `tests/language.test.ts` over all of `src/`. |
| 5 | Every section leads with a sentence | `shared/ui.tsx` `Section`/`Page`; **Manual** script A. |
| 6 | Colour never the only signal | Code as listed under rule 5; **Manual** script C. |
| 7 | "Still getting to know them" before 14 days, no trend, both views | `computeTrajectory` returns no domains or triage below 14 days — `tests/trajectory.test.ts` "refuses to show any trend before 14 days" (tries 0–13 days with a dramatic fall). `tests/referral.test.tsx` "shows no chart and no trend before 14 days". `tests/rules.test.ts` — no referral alert. UI: `StillGettingToKnow` in `DomainCharts.tsx`, used by Dashboard, Trends, Alerts, Health Worker person view and the referral; WAIT rows unranked (`health-worker/village.ts`, tested in `tests/trajectory.test.ts`). Browser-checked with a 6-day record in both views. |
| 8 | No health-worker route can reach vault media, relatives' names or session content | **Data layer:** `src/health-worker/boundary.ts` — whitelisted record shapes (including `wayfinding`: a time and extra taps only, never the destination), `project`, `assertHealthWorkerSafe`, `readEnrolledPeople` (name, age, enrolment date and pronoun choice only; no household label, no notes). **Sync:** `game/sync/queue.ts` re-asserts every record before upload; `vite.config.ts` `loomSync` rejects any record carrying a non-whitelisted key. **Tests:** `tests/boundary.test.ts` walks the runtime import graph of every file under `src/routes/asha`, `src/components/health-worker` and `src/health-worker` against the family-only modules (photos, voice/settings, album/session, profile store, activity telemetry, reminders, activities, NPCs, dialogue, story, caregiver check-ins); and feeds a device full of family data through the data layer, asserting no family string survives. |
| 8a | The health worker has their own route, never the caregiver console's chrome | `src/routes/asha/AshaRoute.tsx` — own header "LOOM · Health Worker", indigo `.theme-asha` accent (`index.css`), the boundary line under the header (`ASHA_BOUNDARY_LINE`). `App.tsx` mounts `/asha` **outside every family data provider**, so any vault hook under it throws. **Tests:** `tests/asha-route.test.tsx` renders the route with no providers and a device full of family data (would throw if a vault hook were reached), asserts the header identity and boundary line verbatim, that no family string appears, and that no button or link mentions photos, album, people, settings, setup, vault, voice, your data or memories. `tests/boundary.test.ts` finds every file marked `@loom-vault` (photos, voice/settings, album/session, profile/family details — the marker list is itself asserted) and fails if any file under `src/routes/asha`, `src/components/health-worker` or `src/health-worker` can import one, directly or through other modules. Mutation-checked: adding `usePhotos` to the health-worker view fails both. |
| 9 | Nothing below 14px on caregiver screens | `tests/language.test.ts`; **Manual** script B. |
| 10 | Charts readable without colour, with a text alternative | `tests/referral.test.tsx` — five domain charts, each `role="img"` + `aria-label` + `<title>`. `DomainCharts.tsx` encodes with hatch / grey band / solid line / dotted marker, not colour. The Trends "Day by Day" chart is now a table. **Manual** script C for greyscale. |

### Known limits (not yet enforced)

- **One device, two roles, for the demo.** `/asha` is its own route outside the family's data
  providers, but the title screen's "Health worker dashboard" button, Setup › Your data and the URL let
  anyone on the family's device reach both. In production these are separate logins, and the health
  worker reads only synced data.
- **The sync server is a local stand-in** (`vite.config.ts`, dev and preview only). A production
  server needs authentication, and must apply the same key whitelist on arrival.
- Scripts A–C are manual. Moving them into a browser test runner (e.g. Playwright) would make them
  automatic.

---

## Other guarantees built in this round

| Guarantee | Where | Checked by |
|---|---|---|
| Alerts are never deleted; acknowledging moves them to Handled; no numeric badge | `game/alerts/AlertsContext.tsx` (ledger append-only; `acknowledge` only sets `handledAt`); `CareRoute.tsx` tab labels are plain words | Code |
| One alert per thing, never a tally | `game/alerts/derive.ts` — reminders: yesterday only; referrals: at most one per fortnight; app-changed: only changes caused by the person's own history | `tests/rules.test.ts` |
| "The app has changed" is explained and reversible | `derive.ts` `appChangedDrafts` (a sentence with "because…"); `AlertsContext` `keepEarlier` / `letAppAdjust` via `settings.adaptiveOverrides`; `adapt/difficulty.ts` honours overrides | `tests/rules.test.ts`; browser-tested |
| RUDAS: six items, /30, two messages, repeatable history, sets starting bands, in the referral | `game/clinical/rudas.ts`, `RudasPanel.tsx`, `adapt/difficulty.ts`, `ReferralSummary.tsx` | `tests/rules.test.ts`, `tests/referral.test.tsx` |
| Caregiver check-in is optional, skippable, never blocks; a rise is mentioned once | `HowAreYouPanel.tsx`, `game/wellbeing/checkin.ts` `shouldShowNotice`; answers never synced | `tests/rules.test.ts` |
| Export everything, as a readable file | `YourDataPanel.tsx`, `ArchiveDocument.tsx`, `game/data/yourData.ts` | Browser-tested |
| Delete everything genuinely deletes, locally and from the sync queue, and erases the server copy | `game/data/yourData.ts` `eraseEverything`, `game/sync/queue.ts` `eraseFromQueue`, `vite.config.ts` erase handler | Browser-tested (keys gone, queue cleared, server file removed) |
| Live sync status | `game/sync/useSyncStatus.ts`, `YourDataPanel.tsx` | Browser-tested offline → queue grew → online → cleared |

---

## Manual check scripts

Open the care console (Carer setup), then paste into the browser console.

**A — every section leads with a sentence; B — nothing under 14px**

```js
for (const tab of ["Caregiver","Alerts","Reminders","How are you?","RUDAS","Trends","Health Worker","Album","Photos","People","Setup","Your data"]) {
  [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === tab).click();
  await new Promise((r) => setTimeout(r, 700));
  const root = document.querySelector(".animate-crossfade");
  const noLead = [...root.querySelectorAll("section")].filter((s) => [...s.children].filter((k) => !/^H[1-6]$/.test(k.tagName))[0]?.tagName !== "P");
  const small = [...root.querySelectorAll("*")].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 14);
  console.log(tab, { sectionsWithoutLead: noLead.length, textUnder14px: small.length });
}
```

**C — greyscale**

```js
document.documentElement.style.filter = "grayscale(1)"; // look at every chart and state; then set it back to ""
```

---

## Navigation (care console)

| Rule | Where | Checked by |
|---|---|---|
| Five tabs — Today · (person's) world · Progress · You · Setup — with sections as a segmented control, never a third level | `src/routes/care/CareRoute.tsx` (`SEGMENTS`) | Code; browser |
| Alerts are a header control: a marker plus "Needs you", or "Nothing needs you". No number. Opens over the current tab | `CareRoute.tsx` header + `AlertsDrawer` | Browser; `tests/language.test.ts` covers the route files |
| Start a session is the header's primary button on every tab | `CareRoute.tsx`, `StartSessionButton` in `SessionStarter.tsx` | Browser (started from Progress → activity opened) |
| ≥1024px tabs inline; <1024px tabs wrap to a second line; <640px bottom bar with icon + short label; no horizontal scroll or scroll arrows at any width | `CareRoute.tsx` responsive classes; no `overflow-x-auto` anywhere in the header | **Manual** script D at 1280, 1024, 1023, 768 and 390px, with the longest tab label ("Bhagyalakshmi's world") and "Needs you" showing; `/asha` checked at the same widths |

**D — no horizontal scroll** (run on /care or /asha at each width)

```js
const vw = innerWidth;
[...document.querySelectorAll("body *")].filter((el) => {
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  return ((cs.overflowX === "auto" || cs.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1) ||
    (r.width && (r.right > vw + 1 || r.left < -1) && cs.position !== "fixed" && !el.closest("svg"));
}); // expect []
```

---

## Today (the caregiver's landing screen)

| Rule | Where | Checked by |
|---|---|---|
| Whether today was fine is the first sentence, 24px, generated, never a digit | `game/today/today.ts` `openingSentence` / `greeting`; `TodayScreen.tsx` hero | `tests/today.test.ts` — steady, harder-than-usual (own usual only), set aside, no session, name vs pronoun, and "never contains a digit or a percentage"; browser: 24px computed |
| No hero numbers; the old stat tiles are folded into plain lines | `TodayScreen.tsx` Today column | Code; browser |
| Needs you = open alerts only, with a reassuring empty state | `TodayScreen.tsx` (`useAlerts().open`) | Browser: "Nothing needs you right now." |
| What she can still do / Things to talk about render as "Coming soon" placeholders | `TodayScreen.tsx` | Browser |
| This week: one sparkline and one word — no axis, no numbers, and nothing before 14 days | `TodayScreen.tsx` `Sparkline`; `today.ts` `weekWord` | `tests/today.test.ts` "has no trend word before the baseline exists"; browser: no SVG with a 6-day record, and `aria-label` on the sparkline |
| Two columns stack below 768px, Today first | `TodayScreen.tsx` (`md:grid-cols-2`) | Browser at 767 / 768 / 390px |

## Health worker console (/asha)

| Rule | Where | Checked by |
|---|---|---|
| Header: LOOM · Health Worker · block, own accent, boundary line | `routes/asha/AshaRoute.tsx` | `tests/asha-route.test.tsx` |
| Two tabs only: Village, Referrals | `AshaRoute.tsx` | `tests/asha-route.test.tsx` "has exactly two tabs…" |
| Village list sorted by slope; filters All / Needs attention / Still learning | `health-worker/village.ts` `triageVillage`; `components/health-worker/VillageTab.tsx` | `tests/trajectory.test.ts` sort order; browser: each filter |
| WAIT before 14 days, shown as "still getting to know" and "WAIT · n of 14 days", unranked | `village.ts`, `VillageTab.tsx`, `triage.tsx` | `tests/trajectory.test.ts`; `tests/asha-route.test.tsx` |
| Row opens a person panel in place: domains against baseline, what moved and when, sentence, Generate referral summary | `components/health-worker/PersonPanel.tsx` | Browser: five charts with text alternatives; referral opens without home notes |
| Coverage strip: enrolled, complete baseline, referred this month | `VillageTab.tsx` | Browser |
