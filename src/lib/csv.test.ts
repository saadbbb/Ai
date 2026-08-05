import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins headers and rows with CRLF, matching RFC 4180", () => {
    const csv = toCsv(["Name", "Score"], [["Jane", 80]]);
    expect(csv).toBe("Name,Score\r\nJane,80");
  });

  it("quotes and doubles internal quotes in a field containing a comma", () => {
    const csv = toCsv(["Note"], [['Said "hi", then left']]);
    expect(csv).toBe('Note\r\n"Said ""hi"", then left"');
  });

  it("quotes a field containing a newline", () => {
    const csv = toCsv(["Note"], [["line one\nline two"]]);
    expect(csv).toBe('Note\r\n"line one\nline two"');
  });

  it("leaves a plain field unquoted", () => {
    const csv = toCsv(["Name"], [["Jane Customer"]]);
    expect(csv).toBe("Name\r\nJane Customer");
  });
});
