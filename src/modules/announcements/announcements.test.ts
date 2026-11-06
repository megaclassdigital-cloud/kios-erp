import { describe, expect, it } from "vitest";
import { ANNOUNCEMENTS, pendingAnnouncements } from "./announcements";

describe("announcements", () => {
  it("shows the titipan announcement to someone who can manage consignment, once", () => {
    const has = (p: string) => p === "consignment.manage";
    expect(pendingAnnouncements({ has, done: new Set() }).map((a) => a.key)).toContain("titipan-v2");
    expect(pendingAnnouncements({ has, done: new Set(["titipan-v2"]) })).toEqual([]);
  });

  it("does not show it to someone who cannot use the feature", () => {
    expect(pendingAnnouncements({ has: () => false, done: new Set() })).toEqual([]);
  });

  it("has unique keys and real content in every slide", () => {
    expect(new Set(ANNOUNCEMENTS.map((a) => a.key)).size).toBe(ANNOUNCEMENTS.length);
    for (const a of ANNOUNCEMENTS) {
      expect(a.slides.length).toBeGreaterThan(0);
      for (const s of a.slides) expect(s.title && s.body.length).toBeTruthy();
    }
  });
});

import { nextToShow } from "./announcements";

describe("nextToShow", () => {
  const list = [{ key: "a" }, { key: "b" }];
  it("shows the first the server lists", () => {
    expect(nextToShow(list, new Set())?.key).toBe("a");
  });
  it("skips one whose tutorial is under way, until the page is reloaded", () => {
    expect(nextToShow(list, new Set(["a"]))?.key).toBe("b");
    expect(nextToShow(list, new Set(["a", "b"]))).toBeNull();
  });
});
