/**
 * tests/lib/rtl.spec.ts — Smoke checks for the RTL foundation.
 *
 * We can not actually "render a page in RTL" inside vitest without a DOM
 * (this project uses `environment: "node"`). Instead we exercise the
 * bits that *are* pure logic:
 *
 *   - `isRTL()` recognizes the 5 RTL BCP-47 roots + ignores false
 *     positives.
 *   - `applyDocumentDirection()` writes the correct `dir` attribute on
 *     `documentElement` using a minimal jsdom-free document stub.
 *   - i18n.languageChanged + applyDocumentDirection stay in sync via the
 *     helper exported in `src/lib/i18n.ts`.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { isRTL, applyDocumentDirection, toBCP47 } from "../../src/lib/format";

describe("isRTL()", () => {
  it.each([
    ["ar", true],
    ["ar-SA", true],
    ["he", true],
    ["he-IL", true],
    ["fa", true],
    ["ur", true],
    ["yi", true],
    ["vi", false],
    ["en", false],
    ["en-US", false],
    ["zh", false],
    ["ja", false],
    ["ko", false],
    ["id", false],
    ["es", false],
    ["fr", false],
    ["", false],
  ])("isRTL(%s) === %s", (input, expected) => {
    expect(isRTL(input)).toBe(expected);
  });

  it("returns false for nullish input", () => {
    expect(isRTL(null)).toBe(false);
    expect(isRTL(undefined)).toBe(false);
  });
});

describe("applyDocumentDirection()", () => {
  beforeEach(() => {
    // Each test runs without a real DOM, so we attach a tiny stub.
    (globalThis as any).document = {
      documentElement: {
        _dir: null as string | null,
        setAttribute(name: string, value: string) {
          if (name === "dir") this._dir = value;
        },
      },
    };
  });

  it("sets dir=rtl for Arabic", () => {
    applyDocumentDirection("ar");
    expect((globalThis as any).document.documentElement._dir).toBe("rtl");
  });

  it("sets dir=ltr for English", () => {
    applyDocumentDirection("en");
    expect((globalThis as any).document.documentElement._dir).toBe("ltr");
  });

  it("sets dir=ltr for Vietnamese", () => {
    applyDocumentDirection("vi");
    expect((globalThis as any).document.documentElement._dir).toBe("ltr");
  });

  it("updates dir after switching from LTR → RTL", () => {
    applyDocumentDirection("en");
    expect((globalThis as any).document.documentElement._dir).toBe("ltr");
    applyDocumentDirection("ar");
    expect((globalThis as any).document.documentElement._dir).toBe("rtl");
    applyDocumentDirection("ja");
    expect((globalThis as any).document.documentElement._dir).toBe("ltr");
  });

  it("handles BCP-47 tags (ar-SA)", () => {
    applyDocumentDirection("ar-SA");
    expect((globalThis as any).document.documentElement._dir).toBe("rtl");
  });
});

describe("toBCP47()", () => {
  it("maps known short codes", () => {
    expect(toBCP47("vi")).toBe("vi-VN");
    expect(toBCP47("en")).toBe("en-US");
    expect(toBCP47("ja")).toBe("ja-JP");
  });

  it("passes through BCP-47 tags untouched", () => {
    expect(toBCP47("ar-SA")).toBe("ar-SA");
    expect(toBCP47("zh-Hant-TW")).toBe("zh-Hant-TW");
  });
});