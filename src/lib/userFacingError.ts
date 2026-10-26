const TECHNICAL_ERROR =
  /(?:\bat\s+\S+\s*\(|syntaxerror|typeerror|referenceerror|econn|enotfound|firestore|firebase|supabase|postgres|node_modules|<\/?[a-z][^>]*>|unexpected token|failed to fetch|networkerror|unauthori[sz]ed|forbidden|internal server error|bad gateway|service unavailable|gateway timeout|http\s*\d{3})/i;

function candidate(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return candidate(record.message) ?? candidate(record.error) ?? candidate(record.detail);
  }
  return null;
}

/** Keeps technical payloads, stacks and raw JSON out of user-facing error states. */
export function toUserMessage(value: unknown, fallback: string): string {
  const raw = candidate(value)?.trim();
  if (!raw) return fallback;

  const compact = raw.replace(/\s+/g, " ");
  if (
    compact.length > 220 ||
    compact.startsWith("{") ||
    compact.startsWith("[") ||
    TECHNICAL_ERROR.test(compact)
  ) {
    return fallback;
  }

  return compact;
}
