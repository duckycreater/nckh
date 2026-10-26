import { describe, expect, it } from "vitest";
import { toUserMessage } from "../../src/lib/userFacingError";

describe("toUserMessage", () => {
  const fallback = "Không thể hoàn tất thao tác. Vui lòng thử lại.";

  it("keeps a short actionable server message", () => {
    expect(toUserMessage({ error: "Bạn không đủ điểm để tạo thẻ." }, fallback)).toBe(
      "Bạn không đủ điểm để tạo thẻ.",
    );
  });

  it("replaces raw JSON, markup and stack-like errors", () => {
    expect(toUserMessage('{"error":"secret"}', fallback)).toBe(fallback);
    expect(toUserMessage("TypeError: failed to fetch at scan.ts:12", fallback)).toBe(fallback);
    expect(toUserMessage("<html>502 upstream error</html>", fallback)).toBe(fallback);
    expect(toUserMessage("Unauthorized", fallback)).toBe(fallback);
    expect(toUserMessage("HTTP 503", fallback)).toBe(fallback);
  });
});
