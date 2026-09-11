import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { fetchVerifiedModelSource, type ModelManifest } from "../../src/services/modelRegistry";

const originalFetch = globalThis.fetch;
const originalCrypto = globalThis.crypto;

function manifest(sha256: string): ModelManifest {
  return {
    name: "waste-classifier",
    version: "v-test",
    framework: "onnx",
    expectedInputSize: [1, 16],
    url: "/models/test.onnx",
    sha256,
    license: "Apache-2.0",
    registeredAt: 1,
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.defineProperty(globalThis, "crypto", { value: originalCrypto, configurable: true });
});

describe("model weight integrity", () => {
  it("accepts bytes matching the manifest SHA-256", async () => {
    const bytes = new TextEncoder().encode("known-model-bytes");
    const digest = await webcrypto.subtle.digest("SHA-256", Buffer.from(bytes));
    const sha = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
    globalThis.fetch = async () => new Response(bytes, { status: 200 });

    const source = await fetchVerifiedModelSource(manifest(sha));
    assert.deepEqual(new Uint8Array(source ?? []), bytes);
  });

  it("fails closed when a CDN serves different bytes", async () => {
    const bytes = new TextEncoder().encode("tampered-model-bytes");
    Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
    globalThis.fetch = async () => new Response(bytes, { status: 200 });

    await assert.rejects(
      fetchVerifiedModelSource(manifest("0".repeat(64))),
      (error: unknown) => error instanceof Error && error.name === "ModelIntegrityError",
    );
  });
});
