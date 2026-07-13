/**
 * scripts/check-secrets.mjs
 *
 * Pre-commit + CI guard: scans the repository for what looks like
 * hard-coded secrets in source files. Catches:
 *   - API keys with common prefixes (AIza, gsk_, sk-, AKIA, eyJ, hf_)
 *   - Long hex/base64 strings assigned to variables named *KEY/SECRET/TOKEN
 *   - Private key headers (-----BEGIN ... PRIVATE KEY-----)
 *
 * Exits 1 with a report on first hit, 0 if clean. Designed to run in
 * CI as a check; not a full secret-detection product (we don't need one
 * for an open-source ISEF project), just enough to catch accidental
 * commits of `.env`-shaped values.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  "coverage",
  ".vite",
  "public",
  "plugins-main",
  ".cursor",
  ".playwright-mcp",
]);
const TEXT_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".env",
  ".ini",
  ".sh",
  ".ps1",
  ".py",
]);

const PATTERNS = [
  { name: "Gemini API key", re: /AIza[0-9A-Za-z_-]{35}/g },
  { name: "Groq API key", re: /gsk_[0-9A-Za-z]{20,}/g },
  { name: "OpenAI API key", re: /sk-[0-9A-Za-z]{20,}/g },
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/g },
  { name: "JWT token", re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
  { name: "HuggingFace token", re: /hf_[A-Za-z0-9]{20,}/g },
  { name: "Resend API key", re: /re_[A-Za-z0-9]{20,}/g },
  { name: "Private key header", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
];

const SUSPICIOUS_VAR_RE =
  /(KEY|SECRET|TOKEN|PASSWORD|PASSWD|PWD)\s*[:=]\s*["']?([A-Za-z0-9_/+=.-]{24,})["']?/g;

const hits = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      walk(full);
    } else if (TEXT_EXTS.has(extname(entry))) {
      scanFile(full);
    }
  }
}

function scanFile(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  // Strip obvious false-positives: env.example, lockfiles, generated
  if (path.endsWith(".env.example")) return;
  if (path.endsWith(".example.json")) return;
  if (path.endsWith(".env")) return; // git-ignored
  if (path.endsWith("package-lock.json")) return;
  if (path.endsWith("SECURITY.md")) return;
  if (path.includes("check-secrets.mjs")) return;
  if (path.endsWith(".gitignore")) return;
  if (path.endsWith("firebase-applet-config.json")) return; // git-ignored, only present locally
  for (const { name, re } of PATTERNS) {
    const matches = text.match(re);
    if (matches) {
      hits.push({ file: path, kind: name, sample: matches[0].slice(0, 16) + "…" });
    }
  }
  // Variable-name patterns (less specific, but catches unprefixed secrets).
  // Skip lines that are purely a process.env.* read — those are config
  // access, not embedded secrets.
  let m;
  while ((m = SUSPICIOUS_VAR_RE.exec(text)) !== null) {
    if (/replace-?with/i.test(m[2])) continue;
    if (/your[-_]?(key|token|secret|password)/i.test(m[2])) continue;
    if (m[2].length < 32) continue;
    if (/^process\.env/i.test(m[2])) continue;
    if (/^require\(["']crypto/i.test(m[2])) continue;
    hits.push({ file: path, kind: "long KEY/TOKEN variable", sample: m[1] + "=" + m[2].slice(0, 12) + "…" });
  }
}

walk(ROOT);

if (hits.length === 0) {
  console.log("[check-secrets] clean — no hard-coded secrets found");
  process.exit(0);
}

console.error("[check-secrets] ⚠️  possible secrets in source:");
for (const h of hits) {
  console.error(`  - ${h.file}  (${h.kind}):  ${h.sample}`);
}
console.error(
  "\nIf any of these are real secrets, rotate them at the upstream provider NOW.",
);
process.exit(1);