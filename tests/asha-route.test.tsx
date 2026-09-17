/**
 * /asha renders with no family data providers at all. Every vault hook (usePhotos,
 * useSettings, useSession, useProfile) throws without its provider, so if any component
 * under this route reached for vault content, this render would fail.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  const map = new Map<string, string>();
  // a device full of family data — none of it may appear
  map.set(
    "loom_profiles_v1",
    JSON.stringify({
      activeId: "p1",
      profiles: [
        {
          id: "p1",
          name: "Ramal's household",
          notes: "Asked for her late husband",
          createdAt: Date.now() - 30 * 86_400_000,
          person: { fullName: "Kamala Devi", birthYear: 1954, pronouns: "she" },
        },
      ],
    }),
  );
  map.set("loom_photos_v1__p1", JSON.stringify([{ id: "x", dataUrl: "data:image/jpeg;base64,AAAA", caption: "Bikash at the river" }]));
  map.set("loom_settings_v1__p1", JSON.stringify({ familyVoiceUrl: "data:audio/webm;base64,BBBB", familyVoiceLabel: "Bikash says hello" }));
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
});

describe("/asha route", () => {
  it("renders outside every family provider, with its own identity and the boundary line", async () => {
    const { AshaRoute, ASHA_BOUNDARY_LINE } = await import("../src/routes/asha/AshaRoute");
    const html = renderToStaticMarkup(<AshaRoute onBackToTitle={() => {}} />);

    expect(html).toContain("Health Worker");
    expect(html).not.toContain("Care Console");
    expect(html).toContain("theme-asha");
    expect(ASHA_BOUNDARY_LINE).toBe(
      "You can see cognitive trends and referral suggestions. Personal photos, voice recordings and family details stay private to the family.",
    );
    expect(html).toContain(ASHA_BOUNDARY_LINE);
    expect(html).toContain("K. Devi");

    for (const secret of ["Ramal", "late husband", "Bikash", "data:image", "data:audio"]) expect(html).not.toContain(secret);
  });

  it("has no control that leads to vault content, people, the album, photos or settings", async () => {
    const { AshaRoute } = await import("../src/routes/asha/AshaRoute");
    const html = renderToStaticMarkup(<AshaRoute onBackToTitle={() => {}} />);
    const controls = [...html.matchAll(/<(button|a)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2].replace(/<[^>]+>/g, "").trim());
    for (const label of controls) {
      expect(label).not.toMatch(/photo|album|people|setting|setup|vault|voice|your data|memor/i);
    }
  });

  it("has exactly two tabs, the block in the header, and WAIT rows with no ranking word", async () => {
    localStorage.setItem("loom_asha_v1", JSON.stringify({ block: "Titabor", referrals: [], showSample: true }));
    const { AshaRoute } = await import("../src/routes/asha/AshaRoute");
    const html = renderToStaticMarkup(<AshaRoute onBackToTitle={() => {}} />);
    const nav = html.match(/<nav aria-label="Health worker"[\s\S]*?<\/nav>/)?.[0] ?? "";
    const tabs = [...nav.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((m) => m[1]);
    expect(tabs).toEqual(["Village", "Referrals"]);
    expect(html).toContain("Titabor");
    expect(html).toContain("still getting to know");
    const text = html.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, "");
    expect(text).toContain("WAIT · 6 of 14 days");
    expect(html).not.toMatch(/Sessions logged|Navigation deviations/i);
  });

  it("has no demo role switcher", async () => {
    const { AshaRoute } = await import("../src/routes/asha/AshaRoute");
    const html = renderToStaticMarkup(<AshaRoute onBackToTitle={() => {}} />);
    expect(html).not.toMatch(/switch role|view as caregiver|Demo:|separate logins/i);
  });
});
