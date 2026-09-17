/**
 * Rules 2, 3, 4, 7 and 9, checked across the source rather than screen by screen, so a new
 * string or a new screen can't quietly break them.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..");

function files(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(join(ROOT, rel)).isDirectory() ? files(rel) : /\.(tsx?|css)$/.test(name) ? [rel] : [];
  });
}

function hits(paths: string[], pattern: RegExp, ignore?: RegExp): string[] {
  return paths.flatMap((file) =>
    readFileSync(join(ROOT, file), "utf8")
      .split("\n")
      .flatMap((line, i) => (pattern.test(line) && !(ignore && ignore.test(line)) ? [`${file}:${i + 1}: ${line.trim()}`] : [])),
  );
}

const ALL_SRC = files("src");
const CAREGIVER_SURFACES = [
  ...files("src/components/caregiver"),
  ...files("src/components/charts"),
  ...files("src/components/referral"),
  ...files("src/health-worker"),
  ...files("src/components/health-worker"),
  ...files("src/components/shared"),
  ...files("src/routes/care"),
  ...files("src/routes/asha"),
];

describe("no diagnostic language anywhere (rule 4)", () => {
  it("has zero hits in any source file — strings, tooltips, labels, print styles, exports and comments", () => {
    const banned = /alzheimer|dementia stage|severe|moderate|mild cognitive impairment|diagnosis|probability|risk score|cognitive decline rate|stage\s*[1-7]\b/i;
    expect(hits(ALL_SRC, banned)).toEqual([]);
  });
});

describe("no error counts on caregiver or health-worker screens (rules 2 and 3)", () => {
  it("never names deviations, misses, mistakes, accuracy, percentages or streaks", () => {
    expect(hits(CAREGIVER_SURFACES, /deviation|misses|mistake|accuracy|percent|streak|incorrect/i)).toEqual([]);
  });

  it("never uses 'normal' or 'abnormal' as a word", () => {
    expect(hits(CAREGIVER_SURFACES, /\b(ab)?normal\b/i, /font-normal/)).toEqual([]);
  });

  it("has no gauge or dial components", () => {
    expect(hits(CAREGIVER_SURFACES, /gauge|speedometer|needle/i)).toEqual([]);
  });
});

describe("text size floor on caregiver and health-worker screens (rule 9)", () => {
  it("uses nothing below 14px", () => {
    const small = /\btext-xs\b|text-\[(?:[0-9]|1[0-3])(?:\.\d+)?px\]|fontSize:\s*(?:[0-9]|1[0-3])(?:\.\d+)?\b|font-size:\s*(?:[0-9]|1[0-3])(?:\.\d+)?px/;
    expect(hits(CAREGIVER_SURFACES, small)).toEqual([]);
  });
});
