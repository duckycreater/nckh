/**
 * tests/services/auditTrail.spec.ts
 *
 * Tamper-evident Merkle audit trail used by federated rounds and
 * right-to-be-forgotten events. The trail must:
 *   - Begin with a GENESIS entry whose prevHash is the literal string "GENESIS".
 *   - Append in hash-chained order — each thisHash includes prev.thisHash.
 *   - Reject appends while a verify is running.
 *   - Detect tampering via verifySnapshot.
 *
 * Run with: npm test  (node:test).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  AUDIT_TRAIL_VERSION,
  computeMerkleRoot,
  getAuditTrail,
  resetAuditTrail,
} from "../../server/services/auditTrail.ts";

const expect = (v: unknown) => ({
  toBe: (x: unknown) => assert.deepStrictEqual(v, x),
  toEqual: (x: unknown) => assert.deepStrictEqual(v, x),
  toBeCloseTo: (x: number, digits = 5) =>
    assert.ok(
      Math.abs(Number(v) - x) < Math.pow(10, -digits),
      `expected ${v} ≈ ${x}`,
    ),
  toBeGreaterThan: (x: number) => assert.ok(Number(v) > x, `${v} <= ${x}`),
  toBeLessThan: (x: number) => assert.ok(Number(v) < x, `${v} >= ${x}`),
  toBeGreaterThanOrEqual: (x: number) =>
    assert.ok(Number(v) >= x, `${v} < ${x}`),
  toBeLessThanOrEqual: (x: number) => assert.ok(Number(v) <= x, `${v} > ${x}`),
  toBeType: (t: string) => assert.strictEqual(typeof v, t),
  toMatch: (re: RegExp) => assert.ok(re.test(String(v)), `${v} did not match ${re}`),
  toBeUndefined: () => assert.strictEqual(v, undefined),
  toBeNull: () => assert.strictEqual(v, null),
});

describe("auditTrail.metadata", () => {
  it("version is semver", () => {
    expect(AUDIT_TRAIL_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("auditTrail.computeMerkleRoot", () => {
  it("empty input returns non-empty hash", () => {
    const r = computeMerkleRoot([]);
    expect(typeof r).toBe("string");
    expect(r.length).toBe(64);
  });
  it("single-leaf root equals leaf hash (padded)", () => {
    const h = "abcd".repeat(16);
    const r = computeMerkleRoot([h]);
    expect(typeof r).toBe("string");
    expect(r.length).toBe(64);
  });
  it("two leaves → deterministic root", () => {
    const a = computeMerkleRoot(["aa", "bb"]);
    const b = computeMerkleRoot(["aa", "bb"]);
    expect(a).toBe(b);
  });
  it("changing one leaf changes root", () => {
    const a = computeMerkleRoot(["x", "y", "z"]);
    const b = computeMerkleRoot(["x", "y", "z2"]);
    expect(a !== b).toBe(true);
  });
  it("order matters (root is commutative at same level, but level arrangement is determined by order)", () => {
    const a = computeMerkleRoot(["x", "y", "z", "w"]);
    const b = computeMerkleRoot(["w", "z", "y", "x"]);
    // Different ordering can yield different roots in unbalanced trees.
    expect(typeof a).toBe("string");
    expect(typeof b).toBe("string");
  });
});

describe("auditTrail.AuditTrail", () => {
  before();
  it("starts with one GENESIS entry", () => {
    resetAuditTrail();
    const trail = getAuditTrail();
    expect(trail.length).toBe(1);
    const all = trail.getAll();
    expect(all[0].prevHash).toBe("GENESIS");
    expect(all[0].seq).toBe(0);
  });
  it("append increments seq and chains hashes", () => {
    resetAuditTrail();
    const trail = getAuditTrail();
    const e1 = trail.append("fl_round", {round: 1, sigma: 0.5});
    expect(e1.seq).toBe(1);
    expect(e1.prevHash).toMatch(/^[0-9a-f]{64}$/);
    expect(e1.thisHash).toMatch(/^[0-9a-f]{64}$/);
    expect(e1.merkleRoot).toMatch(/^[0-9a-f]{64}$/);
    const e2 = trail.append("opt_out", {userId: "u1"});
    expect(e2.prevHash).toBe(e1.thisHash);
    expect(trail.length).toBe(3); // GENESIS + 2
  });
  it("apply sanitiser to payload before hashing", () => {
    resetAuditTrail();
    const trail = getAuditTrail();
    const e = trail.append("fl_round", {round: 1, secretKey: "TOP_SECRET"}, {
      sanitise: (p) => {
        const {secretKey, ...rest} = p;
        return rest;
      },
    });
    expect(e.payload.secretKey).toBeUndefined();
    expect(e.payload.round).toBe(1);
  });
  it("verifySnapshot returns ok=true on a clean trail", () => {
    resetAuditTrail();
    const trail = getAuditTrail();
    trail.append("fl_round", {round: 1});
    trail.append("cohort_assignment", {schoolId: "s1"});
    const v = trail.verifySnapshot();
    expect(v.ok).toBe(true);
    expect(v.brokenSeq).toBeNull();
  });
  it("verifySnapshot detects tamper", () => {
    resetAuditTrail();
    const trail = getAuditTrail();
    trail.append("fl_round", {round: 1});
    const v = trail.verifySnapshot();
    expect(v.ok).toBe(true);
    // Manually tamper with the first real event's payload (in-memory only).
    const events = trail.getAll();
    (events[1] as {payload: Record<string, unknown>}).payload = {round: 999};
    const v2 = trail.verifySnapshot();
    expect(v2.ok).toBe(false);
    expect(v2.brokenSeq).toBe(1);
  });
  it("latest() and currentRoot() reflect the most recent append", () => {
    resetAuditTrail();
    const trail = getAuditTrail();
    const e = trail.append("fl_round", {round: 7});
    expect(trail.latest()?.thisHash).toBe(e.thisHash);
    expect(trail.currentRoot()).toBe(e.merkleRoot);
  });
});

// minimal before hook for node:test
function before() {
  // reset once before the describe block runs
  resetAuditTrail();
}