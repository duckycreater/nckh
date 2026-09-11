export interface RedeemInfo {
  fullName: string;
  address: string;
}

export type RedeemInfoResult =
  { success: true; data: RedeemInfo } | { success: false; message: string };

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

/** Validate and normalize the minimum delivery information required for a physical reward. */
export function parseRedeemInfo(value: unknown): RedeemInfoResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { success: false, message: "Vui lòng nhập thông tin người nhận." };
  }

  const record = value as Record<string, unknown>;
  const fullName = normalizeText(record.fullName);
  const address = normalizeText(record.address);

  if (fullName.length < 2 || fullName.length > 100) {
    return { success: false, message: "Họ và tên phải dài từ 2 đến 100 ký tự." };
  }
  if (address.length < 10 || address.length > 300) {
    return { success: false, message: "Địa chỉ nhận quà phải dài từ 10 đến 300 ký tự." };
  }

  return { success: true, data: { fullName, address } };
}
