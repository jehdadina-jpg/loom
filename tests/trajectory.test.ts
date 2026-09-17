import { describe, expect, it } from "vitest";
import { sampleVillage } from "../src/health-worker/sampleVillage";
import { triageVillage } from "../src/health-worker/village";
import { BASELINE_DAYS, computeTrajectory, trajectorySentence } from "../src/game/trajectory/trajectory";
import type { HealthWorkerEvent } from "../src/health-worker/boundary";

const NOW = new Date(2026, 8, 17, 15, 0).getTime();
const words = { name: "Asha", subject: "Asha", object: "Asha", possessive: "Asha's" };

describe("trajectory against own baseline", () => {
  it("triages the sample village the way the spec describes", () => {
    const out = Object.fromEntries(
      sampleVillage(NOW).map((r) => {
        const t = computeTrajectory(r.events, NOW);
        return [r.person.fullName, t.state === "ready" ? `${t.triage}: ${t.reason}` : `wait ${t.daysSoFar}`];
      }),
    );
    expect(out).toEqual({
      "Kamala Devi": "refer: sharp change, 9 days",
      "Bina Hazarika": "refer: below own baseline 5 weeks",
      "Ranjit Bora": "monitor: drifting, watch",
      "Sabitri Gogoi": "monitor: more ups and downs than usual",
      "Mohan Saikia": "continue: steady",
      "Tarun Phukan": "wait 6",
    });
  });

  it("sorts the village steepest change first, with no ranking for people still being got to know", () => {
    const rows = triageVillage(sampleVillage(NOW), NOW).map((r) => `${r.triage} ${r.record.person.fullName}`);
    expect(rows[0]).toBe("refer Kamala Devi");
    expect(rows[1]).toBe("refer Bina Hazarika");
    expect(rows.slice(2, 4).every((r) => r.startsWith("monitor"))).toBe(true);
    expect(rows[4]).toBe("continue Mohan Saikia");
    expect(rows[5]).toBe("wait Tarun Phukan");
  });

  it("refuses to show any trend before 14 days of data", () => {
    const DAY = 86_400_000;
    for (let n = 0; n < BASELINE_DAYS; n++) {
      const events: HealthWorkerEvent[] = Array.from({ length: n }, (_, i) => ({
        kind: "activity",
        t: NOW - (n - i) * DAY,
        domain: "memory",
        // a dramatic fall that would trigger a referral if the rule were not enforced
        cue: i > n / 2 ? 4 : 0,
        elapsedMs: 20000,
      }));
      const t = computeTrajectory(events, NOW);
      expect(t.state).toBe("getting-to-know");
      expect(t).not.toHaveProperty("domains");
      expect(t).not.toHaveProperty("triage");
      expect(trajectorySentence(t, words)).toContain("Still getting to know");
    }
  });

  it("describes change in plain words and at most suggests a conversation", () => {
    const sentences = sampleVillage(NOW).map((r) => trajectorySentence(computeTrajectory(r.events, NOW), words));
    for (const s of sentences) {
      expect(s).not.toMatch(/diagnos|probab|risk|stage|severe|moderate|mild|decline/i);
    }
    expect(sentences[0]).toMatch(/worth sharing this with a doctor/);
  });
});
