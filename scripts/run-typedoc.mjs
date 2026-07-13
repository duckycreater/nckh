#!/usr/bin/env node
/**
 * scripts/run-typedoc.mjs
 *
 * Runs typedoc with the locally-installed binary at C:\tools\typedoc-tools.
 *
 * Why this exists (the same story as scripts/eslint.cmd, scripts/prettier.cmd):
 *   `npm install typedoc` inside the project root fails on Windows because
 *   the project path contains Vietnamese diacritics ("phân-loại-rác") which
 *   the Windows installer mishandles for scoped packages. We keep the
 *   toolchain in an ASCII-only directory and invoke it from there.
 *
 * On non-Windows this is just `node node_modules/.bin/typedoc …` so CI
 *   picks it up transparently.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { platform } from "node:os";

const isWin = platform() === "win32";
const args = process.argv.slice(2);
const typedocArgs = ["--options", "typedoc.json", ...args];

let cmd;
let cmdArgs;

if (isWin) {
  const candidate = "C:\\tools\\typedoc-tools\\node_modules\\typedoc\\bin\\typedoc";
  if (!existsSync(candidate)) {
    console.error(
      "[run-typedoc] typedoc not found at C:\\tools\\typedoc-tools.\n" +
        "Run once:  npm install --prefix C:\\tools\\typedoc-tools --no-audit --no-fund --legacy-peer-deps typedoc@0.28.5 typedoc-plugin-markdown@4.6.3\n",
    );
    process.exit(2);
  }
  cmd = "node";
  cmdArgs = [candidate, ...typedocArgs];
} else {
  cmd = "npx";
  cmdArgs = ["--yes", "typedoc@0.28.5", ...typedocArgs];
}

console.log(`[run-typedoc] ${cmd} ${cmdArgs.join(" ")}`);
const r = spawnSync(cmd, cmdArgs, { stdio: "inherit" });
process.exit(r.status ?? 1);