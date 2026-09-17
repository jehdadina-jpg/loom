/**
 * Vault engagement: gated honestly, read only against her own average, never claiming
 * memory or recognition — only what dwell time and what followed actually show.
 */
import { describe, expect, it } from "vitest";
import { computeVaultReading, vaultCatalog, computeItemEngagement } from "../src/game/vault/engagement";
import type { TelemetryEvent } from "../src/game/telemetry/store";
import type { FamilyPhoto } from "../src/game/photos/PhotoLibrary";

const NOW = new Date(2026, 8, 17, 15, 0).getTime();

function comfort(itemId: string, contentType: string, dwellMs: number, daysAgo: number, hoursOffset = 0): TelemetryEvent {
  return { type: "comfort", locationId: "waterpoint", contentType, itemId, dwellMs, timestamp: NOW - daysAgo * 86_400_000 + hoursOffset };
}

function completeAfter(daysAgo: number, hoursOffset: number, cueLevelReached: number): TelemetryEvent {
  return {
    type: "activity_complete",
    activityId: "hearth-sequence",
    domain: "attention",
    attempts: 1,
    cueLevelReached,
    elapsedMs: 20_000,
    timestamp: NOW - daysAgo * 86_400_000 + hoursOffset,
  };
}

const photo = (id: string, caption: string): FamilyPhoto => ({ id, dataUrl: "x", caption, addedAt: NOW });

describe("computeVaultReading — gating", () => {
  it("is 'getting-to-know' with fewer than 5 quiet moments", () => {
    const events = [comfort("story", "story", 20_000, 1)];
    const r = computeVaultReading(events, [], false);
    expect(r.state).toBe("getting-to-know");
    if (r.state === "getting-to-know") {
      expect(r.visitsSoFar).toBe(1);
      expect(r.visitsNeeded).toBe(5);
    }
  });

  it("still surfaces coverage gaps even while still learning", () => {
    const events = [comfort("story", "story", 20_000, 1)];
    const r = computeVaultReading(events, [], false);
    expect(r.gaps.some((g) => g.addTarget === "photos")).toBe(true);
    expect(r.gaps.some((g) => g.addTarget === "voice")).toBe(true);
  });
});

describe("computeVaultReading — what she responds to / less so", () => {
  const photos = [photo("p1", "Wedding photograph"), photo("p2", "Group photo, 2019"), photo("p3", "Garden photo")];

  // p1: shown often, long dwell, always followed by an unaided completion — clearly responds
  // p2: shown often, very short dwell, rarely followed by anything — clearly less so
  // p3, story, song: middling, shown just enough to be judged, nothing extreme
  const events: TelemetryEvent[] = [
    ...[1, 2, 3, 4].map((d) => comfort("p1", "photos", 90_000, d)),
    ...[1, 2, 3, 4].map((d) => completeAfter(d, 60_000, 0)),
    ...[1, 2, 3].map((d) => comfort("p2", "photos", 4_000, d, 2 * 3_600_000)),
    ...[1, 2, 3].map((d) => comfort("p3", "photos", 30_000, d, 4 * 3_600_000)),
    ...[1, 2, 3].map((d) => completeAfter(d, 4 * 3_600_000 + 60_000, 1)),
    ...[1, 2, 3].map((d) => comfort("story", "story", 32_000, d, 6 * 3_600_000)),
    ...[1, 2, 3].map((d) => comfort("song", "song", 28_000, d, 8 * 3_600_000)),
  ];

  const r = computeVaultReading(events, photos, false);

  it("reaches a ready state with enough quiet moments logged", () => {
    expect(r.state).toBe("ready");
  });

  it("names the long-dwelling, consistently-followed photo as something she responds to", () => {
    if (r.state !== "ready") throw new Error("expected ready");
    expect(r.respondsTo.some((x) => x.item.id === "p1")).toBe(true);
    expect(r.respondsTo.find((x) => x.item.id === "p1")?.item.label).toBe("Wedding photograph");
  });

  it("names the short-dwelling, rarely-followed photo as less so, framed neutrally", () => {
    if (r.state !== "ready") throw new Error("expected ready");
    const p2 = r.lessSo.find((x) => x.item.id === "p2");
    expect(p2).toBeDefined();
    expect(p2!.phrase).not.toMatch(/fail|wrong|bad|poor/i);
  });

  it("never claims memory or recognition — only describes observed engagement", () => {
    if (r.state !== "ready") throw new Error("expected ready");
    const banned = /remember|recognis|recall/i;
    for (const x of [...r.respondsTo, ...r.lessSo]) expect(x.phrase).not.toMatch(banned);
  });

  it("never invents a detail not present in the saved content", () => {
    if (r.state !== "ready") throw new Error("expected ready");
    for (const x of [...r.respondsTo, ...r.lessSo]) {
      if (x.item.kind === "photo") expect(photos.some((p) => p.id === x.item.id && (p.caption || "A family photograph") === x.item.label)).toBe(true);
      if (x.item.kind === "song") expect(x.item.label).toBe("The comfort song");
      if (x.item.kind === "story") expect(x.item.label).toBe("The comfort story");
    }
  });
});

describe("coverage gaps", () => {
  it("flags no photographs at all", () => {
    const events = Array.from({ length: 6 }, (_, i) => comfort("story", "story", 20_000, i));
    const r = computeVaultReading(events, [], true);
    expect(r.gaps.some((g) => g.id === "photos-none")).toBe(true);
    expect(r.gaps.some((g) => g.addTarget === "voice")).toBe(false);
  });

  it("flags too few photographs, naming the exact count, and stops once there are enough", () => {
    const events = Array.from({ length: 6 }, (_, i) => comfort("story", "story", 20_000, i));
    const two = computeVaultReading(events, [photo("p1", "a"), photo("p2", "b")], true);
    expect(two.gaps.find((g) => g.id === "photos-few")?.text).toContain("Only 2 family photographs");

    const three = computeVaultReading(events, [photo("p1", "a"), photo("p2", "b"), photo("p3", "c")], true);
    expect(three.gaps.some((g) => g.addTarget === "photos")).toBe(false);
  });

  it("flags no family voice recording", () => {
    const events = Array.from({ length: 6 }, (_, i) => comfort("story", "story", 20_000, i));
    const r = computeVaultReading(events, [photo("p1", "a"), photo("p2", "b"), photo("p3", "c")], false);
    expect(r.gaps.some((g) => g.id === "voice-none")).toBe(true);
  });

  it("never fabricates a location- or era-specific gap the data can't support", () => {
    const events = Array.from({ length: 6 }, (_, i) => comfort("story", "story", 20_000, i));
    const r = computeVaultReading(events, [], false);
    for (const g of r.gaps) expect(g.text).not.toMatch(/market|before 19\d0|1971/i);
  });
});

describe("vaultCatalog", () => {
  it("includes every saved photo plus the fixed story and song, and the voice recording only if one exists", () => {
    const withVoice = vaultCatalog([photo("p1", "a")], true);
    expect(withVoice.map((i) => i.id).sort()).toEqual(["p1", "song", "story", "voice"]);
    const withoutVoice = vaultCatalog([photo("p1", "a")], false);
    expect(withoutVoice.map((i) => i.id).sort()).toEqual(["p1", "song", "story"]);
  });
});

describe("computeItemEngagement", () => {
  it("computes per-item dwell and follow-through independent of classification", () => {
    const catalog = vaultCatalog([photo("p1", "a")], false);
    const events: TelemetryEvent[] = [comfort("p1", "photos", 10_000, 1), completeAfter(1, 60_000, 0), comfort("p1", "photos", 20_000, 2)];
    const stats = computeItemEngagement(events, catalog);
    const p1 = stats.find((s) => s.item.id === "p1")!;
    expect(p1.timesShown).toBe(2);
    expect(p1.avgDwellMs).toBe(15_000);
    expect(p1.continuedRate).toBe(0.5);
    expect(p1.settledRate).toBe(0.5);
  });
});
