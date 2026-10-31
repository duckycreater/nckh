import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ensureAccountId, legacyAccountId } from "../../server/services/accountIdentity";

describe("legacy account identity", () => {
  it("derives the same valid UUID for the same normalized nickname", () => {
    const first = legacyAccountId(" Duc_0804 ");
    const second = legacyAccountId("duc_0804");
    assert.equal(first, second);
    assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("only repairs records whose account id is missing", () => {
    const legacy: { nick: string; account_id?: string } = { nick: "legacy_user" };
    assert.equal(ensureAccountId(legacy), true);
    const assigned = legacy.account_id;
    assert.equal(ensureAccountId(legacy), false);
    assert.equal(legacy.account_id, assigned);

    const current = { nick: "current_user", account_id: "existing-id" };
    assert.equal(ensureAccountId(current), false);
    assert.equal(current.account_id, "existing-id");
  });
});
