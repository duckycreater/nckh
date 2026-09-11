import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseRedeemInfo } from "../../src/lib/redemption.js";

describe("reward redemption delivery information", () => {
  it("normalizes a valid Vietnamese recipient and address", () => {
    assert.deepEqual(
      parseRedeemInfo({
        fullName: "  Nguyễn   Văn A  ",
        address: "  12 Nguyễn Trãi,  Phường Bến Thành, Quận 1, TP.HCM ",
      }),
      {
        success: true,
        data: {
          fullName: "Nguyễn Văn A",
          address: "12 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM",
        },
      },
    );
  });

  it("requires a useful delivery address", () => {
    assert.deepEqual(parseRedeemInfo({ fullName: "Nguyễn A", address: "Quận 1" }), {
      success: false,
      message: "Địa chỉ nhận quà phải dài từ 10 đến 300 ký tự.",
    });
  });

  it("does not accept the legacy class field as an address", () => {
    assert.equal(parseRedeemInfo({ fullName: "Nguyễn A", class: "10A1" }).success, false);
  });
});
