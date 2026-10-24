import { describe, expect, it } from "vitest";
import { isDisplayableImageUrl } from "../../src/lib/media";

describe("isDisplayableImageUrl", () => {
  it("accepts local and CSP-approved image sources", () => {
    expect(isDisplayableImageUrl("/assets/bmo/reward.webp")).toBe(true);
    expect(isDisplayableImageUrl("data:image/png;base64,AA==")).toBe(true);
    expect(isDisplayableImageUrl("https://res.cloudinary.com/demo/image.png")).toBe(true);
    expect(isDisplayableImageUrl("https://images.unsplash.com/photo-1")).toBe(true);
  });

  it("rejects malformed, protocol-relative and unapproved remote sources", () => {
    expect(isDisplayableImageUrl("//example.com/image.png")).toBe(false);
    expect(isDisplayableImageUrl("http://images.unsplash.com/photo-1")).toBe(false);
    expect(isDisplayableImageUrl("https://example.com/image.png")).toBe(false);
    expect(isDisplayableImageUrl("javascript:alert(1)")).toBe(false);
  });
});
