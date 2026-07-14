#!/usr/bin/env node
/**
 * scripts/codegen-i18n.cjs
 *
 * Canonical i18n generator. Replaces the legacy `inject-*.cjs` scripts
 * archived in `scripts/_archive/`.
 *
 * Today this delegates to `build-server-locales.cjs` (the curated server-side
 * error-key catalog) and `apply-translations.cjs` (the curated client-side
 * translations seeded into the 8 user-facing locale packs). A future version
 * will read from a single TypeScript source-of-truth, but for now keeping two
 * curated catalogs is what the project actually uses.
 *
 * Idempotent: running it twice produces the same output as running it once.
 *
 * Usage:
 *   npm run codegen:i18n
 *   node scripts/codegen-i18n.cjs --check    # dry-run; exit 1 if anything changes
 */
const { execSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const hasFlag = (flag) => args.includes(flag);

function run(label, cmd) {
  console.log(`\n[codegen-i18n] ${label}`);
  try {
    execSync(cmd, { cwd: ROOT, stdio: "inherit" });
    return true;
  } catch (err) {
    console.error(`[codegen-i18n] FAIL: ${label}`);
    return false;
  }
}

const steps = [
  ["Build server-side error catalog", "node scripts/build-server-locales.cjs"],
  [
    checkOnly
      ? "Verify client-side locale JSONs are up-to-date (dry-run)"
      : "Seed client-side translations",
    hasFlag("--server-only")
      ? "echo skipping client-side"
      : "node scripts/_archive/apply-translations.cjs",
  ],
  ["Parity + duplicate-key guard", "node scripts/check-i18n.cjs"],
  ["Server-locale coverage guard", "node scripts/check-server-locales.cjs"],
];

let allOk = true;
for (const [label, cmd] of steps) {
  if (!run(label, cmd)) {
    allOk = false;
    break;
  }
}

if (!allOk) {
  console.error("\n[codegen-i18n] FAILED — see above.");
  process.exit(1);
}
console.log("\n[codegen-i18n] OK");
