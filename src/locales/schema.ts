/**
 * Translation schema utilities — enforce consistent key set across locales.
 *
 * We intentionally do NOT type every leaf as a literal-string union because:
 *  - It would force 19+ json-driven language packs to be statically known
 *    at build time (impossible for community translations).
 *  - Translations are validated at runtime by `tests/services/i18n.spec.ts`.
 *
 * What we DO expose:
 *  - A recursive `TranslationNode` shape so JSON structure is uniform.
 *  - `flattenKeys()` for code-side linting (duplicate detection, parity check).
 *  - `findDuplicateKeys()` so duplicate-key JSON files are flagged early.
 */

export type TranslationNode = string | { [k: string]: TranslationNode };

export type TranslationSchema = { [namespace: string]: TranslationNode };

/** Recursively collect dotted paths from a translation object. */
export function flattenKeys(
  obj: TranslationNode | undefined | null,
  prefix = "",
  acc: string[] = [],
): string[] {
  if (obj == null) return acc;
  if (typeof obj === "string") {
    acc.push(prefix);
    return acc;
  }
  for (const k of Object.keys(obj)) {
    const child = obj[k];
    const next = prefix ? `${prefix}.${k}` : k;
    flattenKeys(child, next, acc);
  }
  return acc;
}

/**
 * Detect duplicate keys inside a JSON file. JSON.parse silently keeps the
 * last value, so we re-tokenise the raw text to surface the bug.
 */
export function findDuplicateKeys(rawJson: string): string[] {
  // Strip strings so colons inside them are not mistaken for key separators.
  const stripped = rawJson.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  const pathStack: string[] = [];
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  const lines = stripped.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Track depth changes via braces.
    for (const ch of line) {
      if (ch === "{") pathStack.push("");
      else if (ch === "}") pathStack.pop();
    }
    const m = line.match(/^\s*"([^"]+)"\s*:/);
    if (m) {
      const key = m[1];
      const fullPath = [...pathStack, key].filter(Boolean).join(".");
      if (seen.has(fullPath)) duplicates.add(fullPath);
      else seen.add(fullPath);
    }
  }
  return [...duplicates];
}

/** Check whether a key is pluralised (i18next _one / _other / _few / _many). */
export function isPluralKey(key: string): boolean {
  return /_(one|other|few|many|two|zero)$/.test(key);
}