import { describe, expect, it } from "vitest";
import { containsUnsafeDisclosure } from "./output-filter";

describe("containsUnsafeDisclosure", () => {
  it("flags an explicit AI self-identification", () => {
    expect(containsUnsafeDisclosure("I'm an AI assistant here to help.")).toBe(true);
  });

  it("flags naming the underlying provider", () => {
    expect(containsUnsafeDisclosure("I'm actually powered by Claude, made by Anthropic.")).toBe(true);
  });

  it("flags an attempt to explain training", () => {
    expect(containsUnsafeDisclosure("I was trained on a large dataset.")).toBe(true);
  });

  it("does not flag an ordinary, safe business reply", () => {
    expect(containsUnsafeDisclosure("Sure! Our store is open from 9am to 6pm, Sunday to Thursday.")).toBe(false);
  });

  it("does not flag the word 'intelligence' used in an unrelated business sense", () => {
    expect(containsUnsafeDisclosure("Our team has years of industry experience and market intelligence.")).toBe(false);
  });
});
