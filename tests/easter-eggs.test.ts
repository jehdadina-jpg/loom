import { describe, expect, it } from "vitest";
import { EASTER_EGGS, TOTAL_EASTER_EGGS } from "../src/data/locations/easterEggs";

describe("village discoveries", () => {
  it("keeps the collection total aligned with the authored scenes", () => {
    const authoredEggs = Object.values(EASTER_EGGS).flat();

    expect(TOTAL_EASTER_EGGS).toBe(authoredEggs.length);
    expect(new Set(authoredEggs.map((egg) => egg.id)).size).toBe(authoredEggs.length);
  });
});