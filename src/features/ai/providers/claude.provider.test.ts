import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { isTransientAnthropicError } from "./claude.provider";

describe("isTransientAnthropicError", () => {
  it("treats a rate-limit error (429) as transient", () => {
    const error = Anthropic.APIError.generate(429, {}, "rate limited", new Headers());
    expect(isTransientAnthropicError(error)).toBe(true);
  });

  it("treats a server error (500+) as transient", () => {
    const error = Anthropic.APIError.generate(529, {}, "overloaded", new Headers());
    expect(isTransientAnthropicError(error)).toBe(true);
  });

  it("treats a connection error as transient", () => {
    const error = new Anthropic.APIConnectionError({ message: "connection refused" });
    expect(isTransientAnthropicError(error)).toBe(true);
  });

  it("does not treat an authentication error (401) as transient", () => {
    const error = Anthropic.APIError.generate(401, {}, "invalid api key", new Headers());
    expect(isTransientAnthropicError(error)).toBe(false);
  });

  it("does not treat a bad request (400) as transient", () => {
    const error = Anthropic.APIError.generate(400, {}, "malformed request", new Headers());
    expect(isTransientAnthropicError(error)).toBe(false);
  });

  it("does not treat an unrelated error as transient", () => {
    expect(isTransientAnthropicError(new Error("something else"))).toBe(false);
  });
});
