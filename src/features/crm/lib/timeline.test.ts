import { describe, expect, it } from "vitest";
import { mergeTimeline } from "./timeline";

describe("mergeTimeline", () => {
  it("merges multiple groups into one array sorted newest-first", () => {
    const result = mergeTimeline(
      [{ id: "a", label: "A", timestamp: new Date("2026-01-01"), href: null }],
      [
        { id: "b", label: "B", timestamp: new Date("2026-01-03"), href: null },
        { id: "c", label: "C", timestamp: new Date("2026-01-02"), href: null },
      ],
    );

    expect(result.map((item) => item.id)).toEqual(["b", "c", "a"]);
  });

  it("returns an empty array when every group is empty", () => {
    expect(mergeTimeline([], [], [])).toEqual([]);
  });
});
