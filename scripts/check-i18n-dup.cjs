const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'src', 'locales');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f));

let hasError = false;

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const stripped = raw.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  const re = /"([^"]+)"\s*:/g;
  const seen = new Set();
  const dup = new Set();
  const stack = [];
  for (const ch of stripped) {
    if (ch === '{') stack.push('');
    else if (ch === '}') stack.pop();
  }
  let m;
  // crude depth-aware check: keep only the most recently seen scope
  const seenDeep = new Map();
  let depth = 0;
  let lineNo = 0;
  const lines = stripped.split(/\r?\n/);
  for (const line of lines) {
    lineNo++;
    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    const lm = line.match(/^\s*"([^"]+)"\s*:/);
    if (lm) {
      const key = lm[1];
      const fullPath = `${depth}:${key}`;
      if (seenDeep.has(fullPath)) {
        dup.add(`${key} (line ${lineNo})`);
      } else {
        seenDeep.set(fullPath, true);
      }
    }
  }
  if (dup.size) {
    console.error(`DUPLICATE in ${path.basename(f)}:`, [...dup]);
    hasError = true;
  } else {
    console.log(`OK ${path.basename(f)}`);
  }
}

process.exit(hasError ? 1 : 0);