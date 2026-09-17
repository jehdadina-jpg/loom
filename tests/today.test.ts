/**
 * Today's opening sentence: specific, plain, never a digit, and only ever compared with the
 * person's own recent sessions.
 */
import { describe, expect, it } from "vitest";
import { greeting, openingSentence, weekWord } from "../src/game/today/today";
import type { SessionRecord } from "../src/game/session/history";
import { computeTrajectory } from "../src/game/trajectory/trajectory";
import { sampleVillage } from "../src/health-worker/sampleVillage";
import { sessionDirection, wayfindingDirection } from "../src/health-worker/village";

const DAY = 86_400_000;
const NOW = new Date(2026, 8, 17, 8, 30).getTime();
const at = (daysAgo: number, hour: number) => new Date(2026, 8, 17 - daysAgo, hour, 14).getTime();
const she = { name: "Kamala", subject: "she", object: "her", possessive: "her" };
const byName = { name: "Kamala", subject: "Kamala", object: "Kamala", possessive: "Kamala's" };

function session(daysAgo: number, hour: number, parts: number, withoutHelp: number, activityId = "veranda-faces", completed = true): SessionRecord {
  const startedAt = at(daysAgo, hour);
  return { sessionId: `${daysAgo}-${hour}`, activityId, startedAt, endedAt: startedAt + 11 * 60_000, completed, parts, partsWithoutHelp: withoutHelp };
}

const usualWeek = [session(5, 9, 5, 4), session(4, 9, 5, 4), session(3, 9, 5, 5), session(2, 9, 5, 4)];

describe("Today opening sentence", () => {
  it("says so plainly when there has been no session", () => {
    expect(openingSentence(usualWeek, she, NOW)).toBe("No session yet today.");
  });

  it("describes a steady session in the activity's own terms", () => {
    expect(openingSentence([...usualWeek, session(0, 8, 5, 4)], she, NOW)).toBe(
      "Kamala had a steady session this morning — she recognised four of five on her own.",
    );
  });

  it("calls a morning harder only against the person's own usual", () => {
    expect(openingSentence([...usualWeek, session(0, 8, 5, 2, "hearth-sequence")], she, NOW)).toBe(
      "Kamala had a harder morning than usual — she put two of five steps in order on her own.",
    );
  });

  it("uses the name, not a guessed pronoun, when none was chosen", () => {
    expect(openingSentence([...usualWeek, session(0, 8, 5, 4)], byName, NOW)).toBe(
      "Kamala had a steady session this morning, and recognised four of five without help.",
    );
  });

  it("is gentle about a session set aside", () => {
    expect(openingSentence([session(0, 8, 0, 0, "veranda-faces", false)], she, NOW)).toBe(
      "Kamala started a session this morning, and it was set aside for another time.",
    );
  });

  it("never contains a digit or a percentage", () => {
    const cases = [
      openingSentence([], she, NOW),
      openingSentence([...usualWeek, session(0, 8, 12, 11)], she, NOW),
      openingSentence([...usualWeek, session(0, 19, 5, 1, "market-count-fruit")], byName, NOW),
    ];
    for (const s of cases) expect(s).not.toMatch(/[0-9%]/);
  });

  it("greets by the time of day", () => {
    expect(greeting(new Date(2026, 8, 17, 8))).toBe("Good morning.");
    expect(greeting(new Date(2026, 8, 17, 14))).toBe("Good afternoon.");
    expect(greeting(new Date(2026, 8, 17, 23))).toBe("Good evening.");
  });
});

describe("This week", () => {
  it("has no trend word before the baseline exists", () => {
    const village = sampleVillage(NOW);
    expect(weekWord(computeTrajectory(village[5].events, NOW))).toBe("still getting to know");
    expect(weekWord(computeTrajectory(village[4].events, NOW))).toBe("steady");
    expect(weekWord(computeTrajectory(village[3].events, NOW))).toBe("up and down");
  });
});

describe("health-worker directions replace the old hero numbers", () => {
  it("describes sessions and wayfinding as directions against the person's own weeks, never a count", () => {
    const [devi, , , , saikia] = sampleVillage(NOW);
    expect(wayfindingDirection(devi.events, NOW)).toBe("Finding familiar places has been taking more tries than in the first weeks.");
    expect(wayfindingDirection(saikia.events, NOW)).toBe("Finding familiar places is about as easy as in the first weeks.");
    expect(sessionDirection(saikia.events, NOW)).toBe("Sessions are happening about as often as in earlier weeks.");
    for (const s of [wayfindingDirection(devi.events, NOW), sessionDirection(devi.events, NOW)]) expect(s).not.toMatch(/[0-9%]/);
    expect(sessionDirection(devi.events.filter((e) => e.t > NOW - 10 * DAY), NOW)).toBe("Too early to say how often sessions usually happen.");
  });
});
