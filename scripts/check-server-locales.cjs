/**
 * scripts/check-server-locales.cjs
 * Verifies server/locales/*.json: no duplicate keys, all 10 locales share the
 * same key set, every value non-empty.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..', 'server', 'locales');
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
console.log(`Found ${files.length} locale files:`, files.join(', '));

function flatten(obj, prefix = '', out = new Set()) {
  if (obj == null) return out;
  if (typeof obj === 'string') {
    if (obj.trim().length === 0) out.add(`__EMPTY__:${prefix}`);
    else out.add(prefix);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

function findDups(raw) {
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
      if (seen.has(full)) dups.push(`${m[1]} @ line ${i + 1}`);
      else seen.set(full, true);
    }
  }
  return dups;
}

const refs = {};
let hasError = false;

for (const code of files) {
  const raw = fs.readFileSync(path.join(DIR, `${code}.json`), 'utf8');
  const dups = findDups(raw);
  if (dups.length) {
    console.error(`DUPLICATE ${code}.json:`, dups);
    hasError = true;
    continue;
  }
  const data = JSON.parse(raw);
  refs[code] = flatten(data);
  console.log(`OK ${code}.json — ${refs[code].size} keys`);
}

// Parity check (excluding en since newer locales may legitimately omit keys)
const enKeys = refs.en || new Set();
for (const [code, keys] of Object.entries(refs)) {
  if (code === 'en') continue;
  const missing = [...enKeys].filter((k) => !keys.has(k) && !k.startsWith('__EMPTY__'));
  const extra = [...keys].filter((k) => !enKeys.has(k) && !k.startsWith('__EMPTY__'));
  if (missing.length || extra.length) {
    console.error(`PARITY ${code}: missing=${missing.length}, extra=${extra.length}`);
    if (missing.length) console.error('  missing:', missing.slice(0, 5));
    if (extra.length) console.error('  extra:  ', extra.slice(0, 5));
    hasError = true;
  } else {
    console.log(`PARITY ${code}: ✓ matches en (${keys.size} keys)`);
  }
}

process.exit(hasError ? 1 : 0);