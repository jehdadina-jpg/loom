/**
 * The referral export: footer verbatim, the right sections, charts with text alternatives,
 * no family notes in the health worker's copy, and no trend before a baseline (rules 7, 10).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReferralSummary } from "../src/components/referral/ReferralSummary";
import { REFERRAL_FOOTER, referralText, type ReferralData } from "../src/game/referral/referral";
import { computeTrajectory } from "../src/game/trajectory/trajectory";
import { computeRhythm } from "../src/game/rhythm/rhythm";
import { sampleVillage } from "../src/health-worker/sampleVillage";

const NOW = new Date(2026, 8, 17, 15, 0).getTime();
const village = sampleVillage(NOW);
const words = { name: "Kamala", subject: "she", object: "her", possessive: "her" };

function data(overrides: Partial<ReferralData> = {}): ReferralData {
  return {
    audience: "family",
    generatedAt: NOW,
    person: { fullName: "Kamala Devi", age: 72, usingSince: NOW - 56 * 86_400_000 },
    rudas: [{ date: NOW - 3 * 86_400_000, total: 21, administeredBy: "Rupa Das (ASHA)" }],
    trajectory: computeTrajectory(village[0].events, NOW),
    rhythm: computeRhythm(village[0].events, NOW),
    words,
    homeNotes: "Left the gas on twice this week.",
    moodComparison: null,
    ...overrides,
  };
}

describe("referral summary", () => {
  it("carries name, age, time using LOOM, RUDAS, the observation, home notes and the footer verbatim", () => {
    const html = renderToStaticMarkup(<ReferralSummary data={data()} />);
    expect(html).toContain("Kamala Devi");
    expect(html).toContain("72");
    expect(html).toContain("8 weeks");
    expect(html).toContain("21");
    expect(html).toContain("Rupa Das (ASHA)");
    expect(html).toContain("It would be worth sharing this with a doctor.");
    expect(html).toContain("Left the gas on twice this week.");
    expect(html).toContain(REFERRAL_FOOTER);
    expect(REFERRAL_FOOTER).toBe(
      "LOOM does not diagnose. This is a record of observed change over time, to support a clinical conversation.",
    );
  });

  it("draws five domain charts, each with a text alternative", () => {
    const html = renderToStaticMarkup(<ReferralSummary data={data()} />);
    const charts = html.match(/<svg[^>]*role="img"[^>]*aria-label="[^"]+"/g) ?? [];
    expect(charts).toHaveLength(5);
    expect(html.match(/<title>/g)?.length).toBe(5);
  });

  it("never includes family notes in the health worker's copy", () => {
    const html = renderToStaticMarkup(<ReferralSummary data={data({ audience: "health-worker" })} />);
    expect(html).not.toContain("Noticed at home");
    expect(html).not.toContain("gas");
    expect(referralText(data({ audience: "health-worker" }))).not.toContain("gas");
  });

  it("shows no chart and no trend before 14 days of data", () => {
    const html = renderToStaticMarkup(<ReferralSummary data={data({ trajectory: computeTrajectory(village[5].events, NOW) })} />);
    expect(html).not.toContain("<svg");
    expect(html).toContain("Still getting to know");
  });

  it("copies as text with the same footer", () => {
    const text = referralText(data());
    expect(text.trim().endsWith(REFERRAL_FOOTER)).toBe(true);
    expect(text).toMatch(/RUDAS[\s\S]*21\/30/);
  });
});
