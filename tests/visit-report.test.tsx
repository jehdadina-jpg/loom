/**
 * The visit report: caregiver observations before app data (rule), honest under-14-days
 * gating, renders with zero caregiver answers or zero app data, no banned clinical
 * language anywhere, and medication markers with no causal language.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VisitReportSummary } from "../src/components/visit/VisitReportSummary";
import { visitReportText, VISIT_REPORT_FOOTER, type VisitReportData } from "../src/game/visit/report";
import { EMPTY_PREP, type PrepAnswers } from "../src/game/visit/prep";
import { computeTrajectory } from "../src/game/trajectory/trajectory";
import { computeRhythm } from "../src/game/rhythm/rhythm";
import { computeSteadiness } from "../src/game/trajectory/steadiness";
import { sampleVillage } from "../src/health-worker/sampleVillage";

const NOW = new Date(2026, 8, 17, 15, 0).getTime();
const village = sampleVillage(NOW);
const words = { name: "Kamala", subject: "she", object: "her", possessive: "her" };

const FULL_PREP: PrepAnswers = {
  sleep: "less",
  sleepNote: "Up most nights.",
  appetite: "losing-weight",
  mood: "anxious",
  moodNote: "",
  behaviours: ["wandering"],
  falls: "yes",
  fallsNote: "Once in the bathroom.",
  medicineIssue: "side-effects",
  worries: "She got lost walking home from the market last week.",
  questions: ["Is this normal for her age?", "Can we adjust the evening dose?", "Should we see a specialist?"],
};

function data(overrides: Partial<VisitReportData> = {}): VisitReportData {
  return {
    generatedAt: NOW,
    person: { fullName: "Kamala Devi", age: 72, usingSince: NOW - 56 * 86_400_000, sessionCount: 40 },
    preparedBy: { name: "Rimi Devi", relationship: "daughter" },
    appointment: { id: "a1", doctorName: "Dr Baruah", speciality: "memory clinic", date: NOW + 3 * 86_400_000, place: "District hospital", createdAt: NOW },
    prep: FULL_PREP,
    rudas: [{ date: NOW - 3 * 86_400_000, total: 21, administeredBy: "Rupa Das (ASHA)" }],
    trajectory: computeTrajectory(village[0].events, NOW),
    rhythm: computeRhythm(village[0].events, NOW),
    steadiness: computeSteadiness(village[0].events, NOW),
    medicines: ["The white tablet — Every day at 8:00 AM"],
    words,
    medicationMarkers: [],
    ...overrides,
  };
}

describe("ordering: caregiver observations before app data", () => {
  it("puts 'what the family wants to discuss' before 'what the app has measured', in the printed HTML", () => {
    const html = renderToStaticMarkup(<VisitReportSummary data={data()} />);
    const discussAt = html.indexOf("What the family wants to discuss");
    const measuredAt = html.indexOf("What the app has measured");
    expect(discussAt).toBeGreaterThan(-1);
    expect(measuredAt).toBeGreaterThan(-1);
    expect(discussAt).toBeLessThan(measuredAt);
  });

  it("puts the same ordering in the plain-text export", () => {
    const text = visitReportText(data());
    const discussAt = text.indexOf("WHAT THE FAMILY WANTS TO DISCUSS");
    const measuredAt = text.indexOf("WHAT THE APP HAS MEASURED");
    expect(discussAt).toBeLessThan(measuredAt);
  });

  it("puts 'what worries me most' at the very top of the discuss section, above the questions' own section header for measured data", () => {
    const html = renderToStaticMarkup(<VisitReportSummary data={data()} />);
    const worriesAt = html.indexOf("She got lost walking home from the market");
    const rudasAt = html.indexOf("RUDAS");
    expect(worriesAt).toBeGreaterThan(-1);
    expect(worriesAt).toBeLessThan(rudasAt);
  });

  it("lists the three questions first, in the order the caregiver wrote them", () => {
    const html = renderToStaticMarkup(<VisitReportSummary data={data()} />);
    const q1 = html.indexOf("Is this normal for her age?");
    const q2 = html.indexOf("Can we adjust the evening dose?");
    const q3 = html.indexOf("Should we see a specialist?");
    expect(q1).toBeLessThan(q2);
    expect(q2).toBeLessThan(q3);
  });
});

describe("renders with zero caregiver answers", () => {
  it("shows honest placeholders instead of the caregiver section, and still shows app data in full", () => {
    const html = renderToStaticMarkup(<VisitReportSummary data={data({ prep: null })} />);
    expect(html).toContain("No questions noted.");
    expect(html).toContain("Nothing recorded yet.");
    expect(html).toContain("RUDAS");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
  });

  it("does the same in the text export", () => {
    const text = visitReportText(data({ prep: null }));
    expect(text).toContain("No questions noted.");
    expect(text).toContain("Nothing recorded yet.");
    expect(text).not.toContain("What worries me most");
  });
});

describe("renders with zero app data", () => {
  it("shows the caregiver section in full and an honest 'not taken' / 'not yet started' for app data", () => {
    const notReady = computeTrajectory([], NOW);
    const html = renderToStaticMarkup(
      <VisitReportSummary data={data({ trajectory: notReady, rhythm: computeRhythm([], NOW), steadiness: computeSteadiness([], NOW), rudas: [], medicines: [] })} />,
    );
    expect(html).toContain("She got lost walking home from the market");
    expect(html).toContain("RUDAS: not taken.");
    expect(html).toContain("None recorded in LOOM.");
    expect(html).toContain("Still building a baseline");
  });
});

describe("under 14 days of data", () => {
  it("shows no trajectory chart and the honest baseline line instead", () => {
    const notReady = computeTrajectory(village[5].events, NOW);
    expect(notReady.state).toBe("getting-to-know");
    const html = renderToStaticMarkup(<VisitReportSummary data={data({ trajectory: notReady })} />);
    expect(html).not.toContain("<svg");
    if (notReady.state === "getting-to-know") {
      expect(html).toContain(`Still building a baseline — ${notReady.daysSoFar} of ${notReady.daysNeeded} days.`);
    }
  });
});

describe("the footer, verbatim, on every copy", () => {
  it("appears in both the HTML and the text export", () => {
    expect(VISIT_REPORT_FOOTER).toBe(
      "LOOM does not diagnose. This is a record of observed change over time, prepared by the family to support a clinical conversation.",
    );
    const html = renderToStaticMarkup(<VisitReportSummary data={data()} />);
    expect(html).toContain(VISIT_REPORT_FOOTER);
    expect(visitReportText(data()).trim().endsWith(VISIT_REPORT_FOOTER)).toBe(true);
  });
});

describe("no banned clinical language anywhere in generated output", () => {
  const banned = /diagnosis|alzheimer|dementia stage|severe|moderate|mild cognitive impairment|probability|risk score|cognitive decline rate/i;

  it("is absent from the full HTML report", () => {
    const html = renderToStaticMarkup(<VisitReportSummary data={data()} />);
    expect(html).not.toMatch(banned);
  });

  it("is absent from the plain-text export", () => {
    expect(visitReportText(data())).not.toMatch(banned);
  });

  it("is absent even with medication markers and a mid-range trajectory present", () => {
    const withMarkers = data({ medicationMarkers: [{ date: NOW - 20 * 86_400_000, label: "medicine changed" }] });
    const html = renderToStaticMarkup(<VisitReportSummary data={withMarkers} />);
    expect(html).not.toMatch(banned);
    expect(visitReportText(withMarkers)).not.toMatch(banned);
  });
});

describe("medication markers: a timeline mark, never a claim", () => {
  it("labels the marker plainly, with no causal language, in the chart's accessible text", () => {
    const marked = data({ medicationMarkers: [{ date: NOW - 20 * 86_400_000, label: "medicine changed" }] });
    const html = renderToStaticMarkup(<VisitReportSummary data={marked} />);
    expect(html).toContain("Medicine changed");
    expect(html).not.toMatch(/since starting|because of the medicine|caused by|led to|resulted from|due to the (medication|dose)/i);
  });

  it("draws the marker as a solid line, distinct from the dashed 'since a pattern changed' line — legible without colour", () => {
    const marked = data({ medicationMarkers: [{ date: NOW - 20 * 86_400_000, label: "medicine changed" }] });
    const html = renderToStaticMarkup(<VisitReportSummary data={marked} />);
    // the medicine-change line has no dash pattern; every other timeline line on these charts does
    expect(html).toMatch(/stroke="#2e2318" stroke-width="1\.6"/);
  });
});
