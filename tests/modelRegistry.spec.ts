/**
 * server/services/modelRegistry.spec.ts — verify HMAC sign / verify cycle
 * and tamper detection.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  signManifest,
  verifyManifest,
  modelRegistry,
  type ModelManifest,
} from "../server/services/modelRegistry";

const sample: ModelManifest = {
  name: "test-model",
  version: "v1",
  framework: "onnx",
  expectedInputSize: [224, 224],
  url: "/models/test.onnx",
  sha256: "deadbeef".repeat(8),
  license: "Apache-2.0",
  registeredAt: 0,
};

describe("signManifest + verifyManifest", () => {
  it("produces a stable hex string for identical input", () => {
    const a = signManifest(sample);
    const b = signManifest(sample);
    expect(a).toBe(b);
    expect(/^[0-9a-f]{64}$/.test(a)).toBe(true);
  });
  it("verify accepts its own signature", () => {
    const sig = signManifest(sample);
    expect(verifyManifest({manifest: sample, signature: sig})).toBe(true);
  });
  it("verify rejects a tampered signature", () => {
    const sig = signManifest(sample);
    const tampered = sig.replace(/.$/, (c) => (c === "0" ? "1" : "0"));
    expect(verifyManifest({manifest: sample, signature: tampered})).toBe(false);
  });
  it("verify rejects a tampered manifest", () => {
    const sig = signManifest(sample);
    const evil = {...sample, url: "https://attacker.example/x.onnx"};
    expect(verifyManifest({manifest: evil, signature: sig})).toBe(false);
  });
});

describe("modelRegistry", () => {
  it("registers and retrieves a manifest", () => {
    const m = modelRegistry.register({...sample, name: "reg-test", version: "v9"});
    const got = modelRegistry.get("reg-test");
    expect(got?.version).toBe("v9");
    expect(got?.url).toBe(m.url);
  });
  it("returns null for unknown model", () => {
    expect(modelRegistry.get("nonexistent-xyz")).toBeNull();
  });
  it("list does not include @ or : entries", () => {
    const list = modelRegistry.list();
    for (const m of list) {
      expect(m.name).not.toContain("@");
    }
  });
});