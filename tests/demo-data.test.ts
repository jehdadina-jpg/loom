/**
 * The demonstration person is only useful if the panels actually read what it is meant to
 * show. Nothing here is typed into the demo as a conclusion — every assertion below runs
 * the app's own computation over the generated record, so if a threshold moves, this fails
 * rather than the demo quietly going flat.
 */
import { describe, expect, it } from "vitest";
import { demoRecord, demoTelemetry, demoPhotos, demoMood, demoPrep, demoStores } from "../src/game/demo/demoData";
import { computeTrajectory, trajectorySentence } from "../src/game/trajectory/trajectory";
import { computeHelpShape } from "../src/game/trajectory/helpShape";
import { computeSteadiness } from "../src/game/trajectory/steadiness";
import { computeRhythm } from "../src/game/rhythm/rhythm";
import { computeVaultReading } from "../src/game/vault/engagement";
import { moodVsMeasured } from "../src/game/mood/mood";
import { derivePreserved } from "../src/game/today/preserved";
import { sessionRecords } from "../src/game/session/history";

const NOW = new Date(2026, 8, 24, 15, 0).getTime();
const record = demoRecord(NOW);
const telemetry = demoTelemetry(NOW);
const words = { name: "Kamala", subject: "she", object: "her", possessive: "her" };

describe("the record has enough history to be worth showing", () => {
  it("covers nine weeks, with sessions and activities every day", () => {
    const days = new Set(record.map((e) => new Date(e.t).toDateString()));
    expect(days.size).toBeGreaterThanOrEqual(60);
    expect(record.filter((e) => e.kind === "session_start").length).toBeGreaterThanOrEqual(120);
    expect(record.filter((e) => e.kind === "activity").length).toBeGreaterThanOrEqual(400);
  });

  it("stays inside the health-worker boundary", () => {
    // demoRecord is typed as HealthWorkerEvent[], but the demo must also survive the runtime check
    const kinds = new Set(record.map((e) => e.kind));
    expect([...kinds].sort()).toEqual(["activity", "reminder_done", "session_end", "session_start", "wayfinding"]);
  });

  it("keeps the telemetry log under the cap that would drop its oldest events", () => {
    expect(telemetry.length).toBeLessThanOrEqual(400);
  });
});

describe("the trajectory shows a range of patterns, not one flat line", () => {
  const trajectory = computeTrajectory(record, NOW);

  it("is past the baseline and ready to read", () => {
    expect(trajectory.state).toBe("ready");
  });

  it("shows a different pattern in each of the four kinds the app can name", () => {
    if (trajectory.state !== "ready") throw new Error("not ready");
    const by = Object.fromEntries(trajectory.domains.map((d) => [d.domain, d.pattern]));
    expect(by.memory).toBe("sustained-shift");
    expect(by.language).toBe("drifting");
    expect(by.attention).toBe("high-variance");
    expect(by.speed).toBe("high-variance");
  });

  it("keeps something genuinely steady, so the app has something to say has held", () => {
    if (trajectory.state !== "ready") throw new Error("not ready");
    const by = Object.fromEntries(trajectory.domains.map((d) => [d.domain, d.pattern]));
    expect(by.visuospatial).toBe("stable");
  });

  it("reads as a plain sentence a caregiver could act on, naming no condition", () => {
    const sentence = trajectorySentence(trajectory, words);
    expect(sentence.length).toBeGreaterThan(20);
    expect(sentence).not.toMatch(/diagnosis|alzheimer|dementia stage|severe|moderate|mild cognitive impairment/i);
  });

  it("reaches a triage a health worker would act on", () => {
    if (trajectory.state !== "ready") throw new Error("not ready");
    expect(["refer", "monitor"]).toContain(trajectory.triage);
  });
});

describe("help shape reaches the recognition-versus-recall reading", () => {
  const shape = computeHelpShape(record, NOW);

  it("leads with recognition holding up better than recall", () => {
    expect(shape.headline).toContain("recognition is holding up better than recall");
  });

  it("builds that from the memory domain's own distribution, not a hand-written line", () => {
    const memory = shape.shapes.find((s) => s.domain === "memory");
    expect(memory).toBeTruthy();
    // the cue level that means "knows it once someone names it" is the bulk of recall attempts
    expect(memory!.counts[2] / memory!.total).toBeGreaterThanOrEqual(0.35);
    expect(memory!.counts[0]).toBeGreaterThan(0);
  });
});

describe("steadiness reaches the widening-spread reading", () => {
  const steadiness = computeSteadiness(record, NOW);

  it("says her days are further apart than they were, with the average holding", () => {
    expect(steadiness.state).toBe("ready");
    if (steadiness.state !== "ready") throw new Error("not ready");
    expect(steadiness.widened).toBe(true);
    expect(steadiness.meanStable).toBe(true);
    expect(steadiness.sentence).toBe(
      "Her days are more different from each other than they were a month ago — same average, wider spread.",
    );
  });

  it("has weekly bands across the whole history for the chart to draw", () => {
    if (steadiness.state !== "ready") throw new Error("not ready");
    expect(steadiness.weeks.length).toBeGreaterThanOrEqual(8);
  });
});

describe("the time-of-day map has a clear best and worst", () => {
  const rhythm = computeRhythm(record, NOW);

  it("names mornings as her best and evenings as her worst", () => {
    expect(rhythm.state).toBe("ready");
    if (rhythm.state !== "ready") throw new Error("not ready");
    expect(rhythm.flat).toBe(false);
    expect(rhythm.best).toBe("morning");
    expect(rhythm.worst).toBe("evening");
    expect(rhythm.actionable.length).toBeGreaterThan(0);
  });
});

describe("the vault shows both halves: what lands and what doesn't", () => {
  const reading = computeVaultReading(telemetry, demoPhotos(NOW), false);

  it("has enough visits to read, and separates the two", () => {
    expect(reading.state).toBe("ready");
    if (reading.state !== "ready") throw new Error("not ready");
    expect(reading.respondsTo.length).toBeGreaterThanOrEqual(2);
    expect(reading.lessSo.length).toBeGreaterThanOrEqual(1);
  });

  it("leaves the missing voice recording showing as a gap worth filling", () => {
    if (reading.state !== "ready") throw new Error("not ready");
    expect(reading.gaps.map((g) => g.id)).toContain("voice-none");
  });
});

describe("what she can still do is built from what actually happened", () => {
  const trajectory = computeTrajectory(record, NOW);
  const items = derivePreserved(
    telemetry,
    trajectory,
    { photos: demoPhotos(NOW), memories: [], familyVoiceLabel: null, comfortVisits: telemetry.filter((e) => e.type === "comfort").length },
    words,
    NOW,
  );

  it("has several lines, including one earned by repetition without help", () => {
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.some((i) => i.text.toLowerCase().includes("without help"))).toBe(true);
  });

  it("never frames any of it as loss", () => {
    for (const i of items) expect(i.text).not.toMatch(/still|for now|decline|worse|fail/i);
  });
});

describe("the caregiver's own read is there to compare against", () => {
  it("agrees with what's measured, which is itself the finding", () => {
    const trajectory = computeTrajectory(record, NOW);
    const comparison = moodVsMeasured(demoMood(NOW), trajectory, NOW);
    expect(comparison).toBeTruthy();
    expect(comparison!.case).toBe("agreeing-declining");
  });
});

describe("the doctor visit is ready to demonstrate end to end", () => {
  const stores = demoStores(NOW);

  it("has an appointment ahead, a past visit already followed up, and prep answers filled in", () => {
    const appointments = stores.loom_appointments_v1 as { id: string; date: number }[];
    expect(appointments.some((a) => a.date > NOW)).toBe(true);
    const visits = stores.loom_visit_history_v1 as { appointmentId: string; changes: string[] }[];
    expect(visits[0].changes).toContain("medication-started");
    // the past appointment is resolved, so Today asks about the one coming up, not the old one
    expect(visits.some((v) => v.appointmentId === appointments[0].id)).toBe(true);
  });

  it("puts a medicine-changed marker inside the window the charts draw", () => {
    const visits = stores.loom_visit_history_v1 as { visitDate: number }[];
    expect(NOW - visits[0].visitDate).toBeLessThan(56 * 86_400_000);
  });

  it("has the caregiver's own worry written in her own words", () => {
    const prep = demoPrep();
    expect(prep.worries.length).toBeGreaterThan(80);
    expect(prep.questions.filter(Boolean)).toHaveLength(3);
  });
});

describe("the sessions rebuild into a readable history", () => {
  it("produces completed sessions the mood prompt and talk prompts can hang off", () => {
    const records = sessionRecords(telemetry);
    expect(records.length).toBeGreaterThanOrEqual(12);
    expect(records.filter((r) => r.completed).length).toBeGreaterThanOrEqual(12);
  });
});
