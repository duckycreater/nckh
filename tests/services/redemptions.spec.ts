import { describe, expect, it } from "vitest";
import { canTransitionRedemption } from "../../server/services/redemptions.js";

describe("redemption state machine", () => {
  it("allows the operational happy path", () => {
    expect(canTransitionRedemption("pending", "approved")).toBe(true);
    expect(canTransitionRedemption("approved", "fulfilled")).toBe(true);
  });

  it("only permits cancellation before fulfilment", () => {
    expect(canTransitionRedemption("pending", "cancelled")).toBe(true);
    expect(canTransitionRedemption("approved", "cancelled")).toBe(true);
    expect(canTransitionRedemption("fulfilled", "cancelled")).toBe(false);
    expect(canTransitionRedemption("cancelled", "approved")).toBe(false);
  });
});
