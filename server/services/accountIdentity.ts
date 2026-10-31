import crypto from "node:crypto";

export interface AccountIdentityRecord {
  nick: string;
  account_id?: string | null;
}

/**
 * Produces a stable RFC 4122 version-5 shaped identifier for accounts created
 * before `account_id` existed. It is deterministic so a temporary database
 * write failure can never assign the same legacy account a different identity.
 */
export function legacyAccountId(nickname: string): string {
  const normalized = nickname.trim().toLowerCase();
  if (!normalized) throw new Error("Cannot derive an account id without a nickname");
  const bytes = Buffer.from(
    crypto.createHash("sha256").update(`bmo-legacy-account:${normalized}`).digest().subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function ensureAccountId<T extends AccountIdentityRecord>(user: T): boolean {
  if (typeof user.account_id === "string" && user.account_id.trim()) {
    user.account_id = user.account_id.trim().toLowerCase();
    return false;
  }
  user.account_id = legacyAccountId(user.nick);
  return true;
}
