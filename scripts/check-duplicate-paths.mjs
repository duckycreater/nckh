#!/usr/bin/env node
/**
 * check-duplicate-paths.mjs
 *
 * Detects files that Git / POSIX would treat as the same path even though
 * they appear twice in the working tree. The two patterns we look for are:
 *
 *   1. Mixed-slash filenames — a literal `\` somewhere in a filename. On
 *      Windows `\` is a path separator, so this should never happen; when
 *      it does, the file was created on a POSIX system (or in a Linux
 *      container) and will silently shadow its forward-slash sibling.
 *
 *   2. Case collisions — `Foo.ts` and `foo.ts` next to each other. Windows
 *      is case-insensitive, so the on-disk view collapses them, but Linux
 *      CI treats them as separate files and you get a runtime "module not
 *      found" the moment the import casing doesn't match what's checked in.
 *
 * Usage:
 *   node scripts/check-duplicate-paths.mjs [root]
 *
 * Exit codes:
 *   0  – no duplicates
 *   1  – duplicates found (script never auto-deletes; a human must resolve)
 */

import { readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const ROOT = process.argv[2] || process.cwd();
const IGNORE = new Set([
  "node_modules", ".git", "dist", "build", "coverage",
  ".vite", ".cursor", ".playwright-mcp",
]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (IGNORE.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (st.isFile()) {
      out.push(full);
    }
  }
  return out;
}

const issues = { mixedSlash: [], caseCollision: [] };

for (const file of walk(ROOT)) {
  const base = file.split(sep).pop();
  if (base.includes("\\")) issues.mixedSlash.push(file);
}

// Case-collision check: scan each directory for filenames that differ only
// in case.
function scanCase(dir) {
  const seen = new Map();
  for (const entry of readdirSync(dir)) {
    if (IGNORE.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      scanCase(full);
      continue;
    }
    const key = entry.toLowerCase();
    if (seen.has(key)) {
      issues.caseCollision.push(`${seen.get(key)}  /  ${full}`);
    } else {
      seen.set(key, full);
    }
  }
}
scanCase(ROOT);

const total = issues.mixedSlash.length + issues.caseCollision.length;
if (total === 0) {
  console.log("✅ No duplicate-path issues found in", ROOT);
  process.exit(0);
}

if (issues.mixedSlash.length) {
  console.error(`❌ Mixed-slash filenames (${issues.mixedSlash.length}):`);
  for (const p of issues.mixedSlash) console.error(`   - ${p}`);
  console.error("");
}
if (issues.caseCollision.length) {
  console.error(`❌ Case-colliding filenames (${issues.caseCollision.length}):`);
  for (const p of issues.caseCollision) console.error(`   - ${p}`);
  console.error("");
}

console.error("Resolve by renaming or removing one of each pair.");
console.error("This script never deletes files — only reports.");
process.exit(1);