/**
 * tests/server/errorMessages.spec.ts
 *
 * Verifies the locale-aware error message lookup:
 *   - Direct hit in requested locale
 *   - Fallback to English when key missing in requested locale
 *   - Unknown locale falls back to English
 *   - Unknown key returns the key string (last-ditch safety)
 *   - localizedError() short helper produces expected JSON shape
 */
import { describe, it, expect } from "vitest";
import { getErrorMessage, localizedError, err, localeOf } from "../../server/services/errorMessages.ts";

describe("getErrorMessage()", () => {
  it("returns Vietnamese for vi", () => {
    expect(getErrorMessage("error.clan.full", "vi")).toMatch(/clan/);
  });

  it("returns English for en", () => {
    expect(getErrorMessage("error.clan.full", "en")).toBe("Clan limit reached. Please join an existing clan.");
  });

  it("returns Japanese for ja", () => {
    expect(getErrorMessage("error.clan.full", "ja")).toMatch(/クラン/);
  });

  it("returns Arabic for ar (RTL locale)", () => {
    expect(getErrorMessage("error.clan.full", "ar")).toMatch(/العشيرة/);
  });

  it("falls back to English for unknown locale", () => {
    expect(getErrorMessage("error.clan.full", "xx")).toBe("Clan limit reached. Please join an existing clan.");
  });

  it("accepts BCP-47 tags (zh-TW → zh)", () => {
    expect(getErrorMessage("error.clan.full", "zh-TW")).toMatch(/家族/);
  });

  it("returns the key string when key does not exist anywhere", () => {
    expect(getErrorMessage("error.does.not.exist", "vi")).toBe("error.does.not.exist");
    expect(getErrorMessage("error.does.not.exist", "en")).toBe("error.does.not.exist");
  });

  it("resolves nested dotted keys", () => {
    expect(getErrorMessage("error.unauthorized", "en")).toBe("Unauthorized");
    expect(getErrorMessage("error.unauthorized", "vi")).toBe("Chưa đăng nhập hoặc phiên đã hết hạn");
  });

  it("handles nullish locale", () => {
    expect(getErrorMessage("error.unauthorized", null)).toBe("Unauthorized");
    expect(getErrorMessage("error.unauthorized", undefined)).toBe("Unauthorized");
  });
});

describe("localizedError() / err()", () => {
  it("emits the expected JSON envelope", () => {
    let captured: { status?: number; body?: unknown } = {};
    const fakeRes = {
      status(code: number) {
        captured.status = code;
        return { json: (b: unknown) => { captured.body = b; return b; } };
      },
    };
    localizedError(fakeRes, 404, "error.notFound", "vi");
    expect(captured.status).toBe(404);
    expect(captured.body).toEqual({ error: expect.any(String) });
  });

  it("err() pulls locale from req.locale", () => {
    let captured: { status?: number; body?: unknown } = {};
    const fakeRes = {
      status(code: number) {
        captured.status = code;
        return { json: (b: unknown) => { captured.body = b; return b; } };
      },
    };
    err(fakeRes, 400, "error.clan.full", { locale: { locale: "vi" } } as any);
    expect(captured.body).toEqual({ error: expect.stringMatching(/clan/i) });
  });

  it("err() tolerates missing req.locale", () => {
    let captured: { status?: number; body?: unknown } = {};
    const fakeRes = {
      status(code: number) {
        captured.status = code;
        return { json: (b: unknown) => { captured.body = b; return b; } };
      },
    };
    err(fakeRes, 500, "error.internal");
    expect(captured.status).toBe(500);
  });
});

describe("localeOf()", () => {
  it("extracts locale from req.locale", () => {
    expect(localeOf({ locale: { locale: "ja" } } as any)).toBe("ja");
  });

  it("returns null when req or req.locale is missing", () => {
    expect(localeOf(null)).toBeNull();
    expect(localeOf(undefined)).toBeNull();
    expect(localeOf({} as any)).toBeNull();
  });
});