/**
 * scripts/refactor-bootstrap-errors.cjs
 *
 * Bulk-replaces the most common hard-coded error strings in server/bootstrap.ts
 * with localized `err(res, STATUS, KEY, req)` calls. Idempotent: skips lines
 * that already use `err(` / `getErrorMessage(`. Run via node.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'server', 'bootstrap.ts');
let src = fs.readFileSync(FILE, 'utf8');

const REPLACEMENTS = [
  [/res\.status\(503\)\.json\(\{\s*error:\s*"Database unavailable"\s*\}\)/g,
   'err(res, 503, "error.databaseUnavailable", req as any)'],
  [/res\.status\(404\)\.json\(\{\s*error:\s*"User not found"\s*\}\)/g,
   'err(res, 404, "error.notFound", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Failed to get clans"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Failed to create clan"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Failed to fetch users"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Failed to reward"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"No file uploaded"\s*\}\)/g,
   'err(res, 400, "error.scan.noText", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Upload failed"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(403\)\.json\(\{\s*error:\s*"Forbidden: Admin access required"\s*\}\)/g,
   'err(res, 403, "error.forbidden", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Failed to fetch reward history"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Failed to fetch reward summary"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Failed to get tournament"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(404\)\.json\(\{\s*error:\s*"Tournament not found"\s*\}\)/g,
   'err(res, 404, "error.notFound", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"Tournament has ended"\s*\}\)/g,
   'err(res, 400, "error.tournamentEnded", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Failed to join tournament"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Failed to get bracket"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(404\)\.json\(\{\s*error:\s*"Match not found"\s*\}\)/g,
   'err(res, 404, "error.notFound", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Failed to create match"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Failed to submit result"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Failed to get history"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"GEMINI_API_KEY is not set"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(500\)\.json\(\{\s*error:\s*"Lỗi không xác định"\s*\}\)/g,
   'err(res, 500, "error.internal", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"imageBase64 or image field is required"\s*\}\)/g,
   'err(res, 400, "error.scan.noText", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"Missing spreadsheetId"\s*\}\)/g,
   'err(res, 400, "error.validationFailed", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"Invalid role\. Must be 'user' or 'admin'\."\s*\}\)/g,
   "err(res, 400, 'error.validationFailed', req as any)"],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"Invalid points value"\s*\}\)/g,
   'err(res, 400, "error.validationFailed", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"Invalid delta value"\s*\}\)/g,
   'err(res, 400, "error.validationFailed", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"Must confirm with \?confirm=true"\s*\}\)/g,
   'err(res, 400, "error.validationFailed", req as any)'],
  [/res\.status\(404\)\.json\(\{\s*error:\s*"No intervention available"\s*\}\)/g,
   'err(res, 404, "error.notFound", req as any)'],
  [/res\.status\(503\)\.json\(\{\s*error:\s*"Quiz database is not configured"\s*\}\)/g,
   'err(res, 503, "error.databaseUnavailable", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"Content is required"\s*\}\)/g,
   'err(res, 400, "error.scan.noText", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"At least 2 options are required"\s*\}\)/g,
   'err(res, 400, "error.validationFailed", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"correct_key must be A, B, C, or D"\s*\}\)/g,
   'err(res, 400, "error.validationFailed", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"Invalid question id"\s*\}\)/g,
   'err(res, 400, "error.validationFailed", req as any)'],
  [/res\.status\(404\)\.json\(\{\s*error:\s*"Question not found"\s*\}\)/g,
   'err(res, 404, "error.notFound", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"orderedIds must be an array"\s*\}\)/g,
   'err(res, 400, "error.validationFailed", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"questions must be an array"\s*\}\)/g,
   'err(res, 400, "error.validationFailed", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"Provide \{key, value\} or batch object"\s*\}\)/g,
   'err(res, 400, "error.validationFailed", req as any)'],
  [/res\.status\(400\)\.json\(\{\s*error:\s*"Not enough EXP to enter \(need 20 EXP\)"\s*\}\)/g,
   'err(res, 400, "error.clan.missingExp", req as any)'],
  [/res\.status\(404\)\.json\(\{\s*error:\s*"No opponents available\. Be the first to enter the arena!"\s*\}\)/g,
   'err(res, 404, "error.notFound", req as any)'],
];

let totalReplaced = 0;
const counts = [];
for (const [pattern, replacement] of REPLACEMENTS) {
  const before = src;
  src = src.replace(pattern, replacement);
  const diff = (before.length - src.length === 0) ? 0 : (before.match(pattern) || []).length;
  if (diff > 0) {
    counts.push({ pattern: String(pattern).slice(0, 60), replaced: diff });
    totalReplaced += diff;
  }
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`Total replacements: ${totalReplaced}`);
for (const c of counts) console.log(`  - ${c.replaced}× ${c.pattern}...`);