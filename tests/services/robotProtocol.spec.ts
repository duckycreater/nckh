import { describe, expect, it } from "vitest";
import {
  RobotEventRequestSchema,
  RobotIdentityRequestSchema,
  robotPayloadHash,
  robotScore,
  signRobotRequest,
  stableJson,
  verifyRobotRequest,
} from "../../server/services/robotProtocol";

const secret = "test-secret-with-at-least-24-characters";

function event(overrides: Record<string, unknown> = {}) {
  return RobotEventRequestSchema.parse({
    event_id: "event-00000001",
    session_id: "session-00000001",
    device_id: "bmo-pi5-00000001",
    identity_token: "a".repeat(64),
    observed_at_ms: 1_800_000_000_000,
    completed_at_ms: 1_800_000_010_000,
    waste_name: "chai nhựa",
    waste_category: "inorganic",
    actual_bin: "inorganic",
    decision: "confirmed",
    recognition_confidence: 0.91,
    tracking_quality: 0.88,
    calibration_version: "calibration-v1:deadbeef",
    evidence_hash: "b".repeat(64),
    client_version: "bmo-2.0.0",
    ...overrides,
  });
}

describe("robotProtocol", () => {
  it("canonicalizes object keys before signing", () => {
    expect(stableJson({ b: 2, a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4},"b":2}');
    expect(robotPayloadHash({ a: 1, b: 2 })).toBe(robotPayloadHash({ b: 2, a: 1 }));
  });

  it("accepts one fresh full-payload HMAC and rejects tampering", () => {
    const body = event();
    const timestamp = "1800000010000";
    const nonce = "nonce-00000000000001";
    const signature = signRobotRequest(
      secret,
      "POST",
      "/api/robot/v2/events",
      timestamp,
      nonce,
      body,
    );
    expect(
      verifyRobotRequest({
        secret,
        method: "POST",
        path: "/api/robot/v2/events",
        timestamp,
        nonce,
        signature,
        body,
        nowMs: Number(timestamp),
      }),
    ).toMatchObject({ ok: true });
    expect(
      verifyRobotRequest({
        secret,
        method: "POST",
        path: "/api/robot/v2/events",
        timestamp,
        nonce,
        signature,
        body: { ...body, actual_bin: "organic" },
        nowMs: Number(timestamp),
      }),
    ).toEqual({ ok: false, reason: "signature_mismatch" });
  });

  it("rejects expired signatures", () => {
    const body = event();
    const timestamp = "1800000010000";
    const nonce = "nonce-00000000000002";
    const signature = signRobotRequest(
      secret,
      "POST",
      "/api/robot/v2/events",
      timestamp,
      nonce,
      body,
    );
    expect(
      verifyRobotRequest({
        secret,
        method: "POST",
        path: "/api/robot/v2/events",
        timestamp,
        nonce,
        signature,
        body,
        nowMs: Number(timestamp) + 300_001,
      }),
    ).toEqual({ ok: false, reason: "expired_timestamp" });
  });

  it("awards only one confirmed correct-bin event for an eligible profile", () => {
    expect(robotScore(event(), true)).toBe(10);
    expect(robotScore(event({ actual_bin: "organic" }), true)).toBe(0);
    expect(robotScore(event({ decision: "uncertain", actual_bin: null }), true)).toBe(0);
    expect(robotScore(event(), false)).toBe(0);
  });

  it("requires method-specific identity evidence", () => {
    expect(
      RobotIdentityRequestSchema.safeParse({
        session_id: "session-00000001",
        device_id: "bmo-pi5-00000001",
        method: "pin",
        account_id: "account-00000001",
      }).success,
    ).toBe(false);
    expect(
      RobotIdentityRequestSchema.safeParse({
        session_id: "session-00000001",
        device_id: "bmo-pi5-00000001",
        method: "badge",
      }).success,
    ).toBe(false);
  });
});
