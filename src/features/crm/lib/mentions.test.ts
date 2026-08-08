import { describe, expect, it } from "vitest";
import { extractMentionTokens } from "./mentions";

describe("extractMentionTokens", () => {
  it("extracts a single mention", () => {
    expect(extractMentionTokens("Can @sara follow up on this?")).toEqual(["sara"]);
  });

  it("extracts multiple mentions and lowercases them", () => {
    expect(extractMentionTokens("@Sara and @Ahmed should both see this")).toEqual(["sara", "ahmed"]);
  });

  it("dedupes repeated mentions of the same person", () => {
    expect(extractMentionTokens("@sara please check. @sara are you there?")).toEqual(["sara"]);
  });

  it("returns an empty array when there are no mentions", () => {
    expect(extractMentionTokens("Just a regular note about the customer.")).toEqual([]);
  });

  it("stops a mention at punctuation", () => {
    expect(extractMentionTokens("cc @sara, thanks!")).toEqual(["sara"]);
  });
});
