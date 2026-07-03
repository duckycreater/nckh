/**
 * auditTrail.ts - Tamper-evident Merkle tree audit trail
 *
 * Persists a Merkle-rooted log of privacy-significant events:
 *   - Per-round FL submission (round_number, σ, clip_norm, n_clients, computedRootHash)
 *   - Per-cohort assignment (study_id, school_id, cohort, assignmentHash)
 *   - Opt-out requests (user_id, ts, scope)
 *   - Right-to-be-forgotten fulfilment (user_id, ts, hash-after-removal)
 *   - Synthetic RCT seed publication (study_id, seed, imageFileHash)
 *
 * Chain topology: each new entry stores the SHA-256 of (prev_root || entry_payload).
 * That gives the "Merkle tree" property: every entry is bound to all previous
 * entries; attempting to alter or delete any prior entry changes the root
 * in a way that verifiers (the IRB or external auditor) can detect.
 *
 * Storage:
 *   - This file: in-memory tree; the actual Merkle root is persisted via
 *     `privacy_audit_log` Supabase table by `routes/federated.ts`.
 *   - Public read endpoint: GET /api/audit/merkle-root
 *   - Public verify endpoint: GET /api/audit/verify?root=...
 *
 * Reference:
 *   Crosby, S. & Wallach, D. S. (2009). Efficient tamper-evident logging.
 *   Becker, G. (2008). Merkle Signature Schemes, Merkle Trees and Their
 *   Applications.
 */

import crypto from "crypto";
import { maybeSelfTest as maybeSecureAggSelfTest } from "./secureAggregation.js";

export const AUDIT_TRAIL_VERSION = "1.0.0";

export type AuditEventKind =
  | "fl_round"
  | "cohort_assignment"
  | "opt_out"
  | "right_to_be_forgotten"
  | "synthetic_seed_published"
  | "research_pre_registration";

export interface AuditEvent {
  /** Auto-incremented integer within the run. */
  seq: number;
  /** ISO timestamp. */
  ts: string;
  /** Event kind. */
  kind: AuditEventKind;
  /** Event payload — KEEP THIS PII-FREE. Pseudonymised IDs only. */
  payload: Record<string, unknown>;
  /** Hash of previous entry; "GENESIS" for the first. */
  prevHash: string;
  /** SHA-256 of (prevHash + canonical(payload)). */
  thisHash: string;
  /** Recomputed Merkle root after this entry appended. */
  merkleRoot: string;
}

export interface AuditSnapshot {
  /** Sequence numbers 0-indexed. */
  total: number;
  /** Current root in hex. */
  rootHex: string;
  /** Last entry. */
  lastEntry: AuditEvent | null;
}

function canonicalise(value: unknown): string {
  // Deterministic JSON serialisation. Sort keys, drop undefined.
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalise).join(",") + "]";
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>)
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .sort();
    return (
      "{" +
      keys
        .map((k) => JSON.stringify(k) + ":" + canonicalise((value as Record<string, unknown>)[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(String(value));
}

function sha256Hex(input: string | Buffer): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  // For leaves we store the payload hash that produced them.
  payloadHash?: string;
}

/**
 * Recompute the Merkle root from the leaves (raw event payloads).
 * Uses sha256(left || right). Pads with the last leaf's hash if odd.
 */
export function computeMerkleRoot(leafHashes: string[]): string {
  if (leafHashes.length === 0) return sha256Hex("GENESIS_MERKLE_ROOT");
  let layer = leafHashes.slice();
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      if (i + 1 === layer.length) {
        next.push(sha256Hex(layer[i] + layer[i]));
      } else {
        next.push(sha256Hex(layer[i] + layer[i + 1]));
      }
    }
    layer = next;
  }
  return layer[0];
}

export interface AppendOptions {
  sanitise?: (payload: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * In-memory audit-trail singleton.
 * Append-only by design — never expose a public delete endpoint.
 */
class AuditTrail {
  private events: AuditEvent[] = [];
  private verifying = false;
  private merkleTrees: MerkleNode[] = [];

  constructor() {
    // The "genesis" event so the first real event still has a prev_hash.
    this.events.push({
      seq: 0,
      ts: new Date(0).toISOString(),
      kind: "fl_round", // placeholder; never queried directly.
      payload: { genesis: true, serverVersion: AUDIT_TRAIL_VERSION },
      prevHash: "GENESIS",
      thisHash: sha256Hex("GENESIS_PREV|0"),
      merkleRoot: sha256Hex("GENESIS_ROOT"),
    });
  }

  get length(): number {
    return this.events.length;
  }

  append(kind: AuditEventKind, payload: Record<string, unknown>, opts: AppendOptions = {}): AuditEvent {
    if (this.verifying) {
      throw new Error("Audit trail is being verified; reject new appends.");
    }
    const sanitised = opts.sanitise ? opts.sanitise(payload) : payload;
    const prev = this.events[this.events.length - 1];
    const seq = prev.seq + 1;
    const ts = new Date().toISOString();
    const prevHash = prev.thisHash;
    const canonical = canonicalise({ kind, payload: sanitised, seq, ts });
    const thisHash = sha256Hex(prevHash + "|" + canonical);
    // Recompute the Merkle root over all event hashes (linear scan; OK for ≤ 10k events).
    const allHashes = this.events.map((e) => e.thisHash).concat([thisHash]);
    const merkleRoot = computeMerkleRoot(allHashes);
    const event: AuditEvent = { seq, ts, kind, payload: sanitised, prevHash, thisHash, merkleRoot };
    this.events.push(event);
    return event;
  }

  getAll(): AuditEvent[] {
    return [...this.events];
  }

  latest(): AuditEvent | null {
    return this.events[this.events.length - 1] ?? null;
  }

  currentRoot(): string {
    return this.events[this.events.length - 1]?.merkleRoot ?? sha256Hex("EMPTY_MERKLE");
  }

  /** Re-verify every entry by recomputing the chain. */
  verifySnapshot(): {
    ok: boolean;
    brokenSeq: number | null;
    expectedRoot: string;
    actualRoot: string;
    reason?: string;
  } {
    this.verifying = true;
    try {
      for (let i = 1; i < this.events.length; i++) {
        const prev = this.events[i - 1];
        const cur = this.events[i];
        const canonical = canonicalise({
          kind: cur.kind,
          payload: cur.payload,
          seq: cur.seq,
          ts: cur.ts,
        });
        const expectedHash = sha256Hex(prev.thisHash + "|" + canonical);
        if (expectedHash !== cur.thisHash) {
          return {
            ok: false,
            brokenSeq: cur.seq,
            expectedRoot: cur.merkleRoot,
            actualRoot: cur.merkleRoot,
            reason: "Hash mismatch",
          };
        }
      }
      const expectedRoot = computeMerkleRoot(this.events.map((e) => e.thisHash));
      const actualRoot = this.events[this.events.length - 1].merkleRoot;
      if (expectedRoot !== actualRoot) {
        return {
          ok: false,
          brokenSeq: this.events[this.events.length - 1].seq,
          expectedRoot,
          actualRoot,
          reason: "Merkle root mismatch",
        };
      }
      return { ok: true, brokenSeq: null, expectedRoot, actualRoot };
    } finally {
      this.verifying = false;
    }
  }

  /** Persist the latest snapshot in a JSON-serialisable form. */
  exportSnapshot(): AuditSnapshot {
    const last = this.events[this.events.length - 1];
    return {
      total: this.events.length,
      rootHex: last ? last.merkleRoot : "EMPTY",
      lastEntry: last ?? null,
    };
  }
}

let _singleton: AuditTrail | null = null;

/** Lazy singleton — first call constructs the in-memory trail. */
export function getAuditTrail(): AuditTrail {
  if (!_singleton) {
    _singleton = new AuditTrail();
    // Run a security self-test once.
    maybeSecureAggSelfTest();
  }
  return _singleton;
}

export function resetAuditTrail(): void {
  _singleton = null;
}
