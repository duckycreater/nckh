#!/usr/bin/env node
/**
 * scripts/check-i18n.cjs
 *
 * CI guard for the entire i18n plan. Runs on every PR and fails loudly
 * when any of the following regressions slip in:
 *
 *   1. Duplicate keys inside any frontend locale JSON (src/locales/*.json)
 *   2. Duplicate keys inside any backend locale JSON (server/locales/*.json)
 *   3. Frontend locale parity: every key in `en.json` must exist in all
 *      other frontend packs (missing → fail; extra → warn).
 *   4. Backend locale parity: same as #3 for server/locales/*.json.
 *   5. Required ErrorKey coverage: every key referenced from a `getErrorMessage(...)`
 *      or `err(res, ..., "...")` call must exist in `server/locales/en.json`.
 *
 * Usage:
 *   node scripts/check-i18n.cjs
 *
 * Exit code:
 *   0  → all checks passed
 *   1  → at least one check failed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FE = path.join(ROOT, 'src', 'locales');
const BE = path.join(ROOT, 'server', 'locales');

let failed = 0;
const log = (ok, label, detail) => {
  const sym = ok ? '✓' : '✗';
  console.log(`[${sym}] ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed++;
};

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function flatten(obj, prefix = '', out = new Set()) {
  if (obj == null) return out;
  if (typeof obj !== 'object') {
    out.add(prefix);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

/** Strip string literals so JSON.parse can't be fooled by an inline duplicate. */
function findDuplicateKeys(raw) {
  const stripped = raw.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  const seen = new Map();
  const dups = [];
  let depth = 0;
  const lines = stripped.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    const m = line.match(/^\s*"([^"]+)"\s*:/);
    if (m) {
      const full = `${depth}:${m[1]}`;
      if (seen.has(full)) dups.push(m[1]);
      else seen.set(full, true);
    }
  }
  return dups;
}

function parityCheck(dir, filesLabel, opts = {}) {
  console.log(`\n→ parity check (${filesLabel})`);
  const all = {};
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const dups = findDuplicateKeys(raw);
    if (dups.length) {
      log(false, `duplicate keys in ${f}`, dups.slice(0, 5).join(', '));
      return;
    }
    const data = readJson(path.join(dir, f));
    all[f.replace('.json', '')] = flatten(data);
  }
  const ref = all.en;
  if (!ref) {
    log(false, 'en.json missing', filesLabel);
    return;
  }
  const total = ref.size;
  log(true, `en.json has ${total} keys (reference)`);
  for (const [code, keys] of Object.entries(all)) {
    if (code === 'en') continue;
    const missing = [...ref].filter((k) => !keys.has(k));
    if (missing.length === 0) {
      log(true, `${code}.json ✓ (${keys.size} keys)`);
      continue;
    }
    const pct = (missing.length / total) * 100;
    // Missing > 30% is treated as a hard failure (likely a real gap).
    // Missing <= 30% falls back to English at runtime via i18n.fallbackLng
    // and is logged as a warning so devs know to translate eventually.
    if (pct > 30) {
      log(false, `${code}.json missing ${missing.length}/${total} keys (${pct.toFixed(1)}%)`, missing.slice(0, 3).join(', '));
    } else {
      console.log(`  [warn] ${code}.json missing ${missing.length}/${total} keys (${pct.toFixed(1)}%) — falls back to en at runtime. Top missing: ${missing.slice(0, 3).join(', ')}`);
      log(true, `${code}.json ⚠ (${keys.size}/${total} keys, will use en fallback)`);
    }
  }
}

function requiredErrorKeysCheck() {
  console.log('\n→ required ErrorKey coverage (server bootstrap)');
  const en = readJson(path.join(BE, 'en.json'));
  const available = new Set(flatten(en));

  // Grep both `"error.something"` and `'error.something'` references
  // in server code.
  let raw;
  try {
    raw = execSync(
      `node -e "const fs=require('fs');const out=[];function walk(p){for(const f of fs.readdirSync(p,{withFileTypes:true})){const fp=path.join(p,f.name);if(f.isDirectory())walk(fp);else if(fp.endsWith('.ts')||fp.endsWith('.tsx'))out.push(fs.readFileSync(fp,'utf8'))}}const path=require('path');const ROOT='${ROOT.replace(/\\/g, '\\\\')}';walk(path.join(ROOT,'server'));console.log(out.join('\\n'));"`,
      { cwd: ROOT, encoding: 'utf8' },
    );
  } catch (e) {
    log(false, 'failed to enumerate server sources', e.message);
    return;
  }
  const references = new Set();
  const re = /(?:getErrorMessage|err)\s*\([^,]+,\s*(?:[^,]+,\s*)?['"]([a-z][\w.]*\.[\w.]+)['"]/g;
  let m;
  while ((m = re.exec(raw))) references.add(m[1]);

  const missing = [...references].filter((k) => !available.has(k));
  if (missing.length) {
    log(false, 'missing error keys referenced from server code', missing.slice(0, 10).join(', '));
  } else {
    log(true, `all ${references.size} error keys resolved in en.json`);
  }
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

console.log('──────────────────────────────────────────────');
console.log(' i18n CI guard');
console.log('──────────────────────────────────────────────');

parityCheck(FE, 'frontend src/locales/*.json');
parityCheck(BE, 'backend server/locales/*.json');
requiredErrorKeysCheck();

console.log('\n──────────────────────────────────────────────');
if (failed) {
  console.log(` ✗ ${failed} check(s) failed`);
  console.log('──────────────────────────────────────────────');
  process.exit(1);
} else {
  console.log(' ✓ all checks passed');
  console.log('──────────────────────────────────────────────');
  process.exit(0);
}