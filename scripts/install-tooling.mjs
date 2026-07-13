#!/usr/bin/env node
/**
 * scripts/install-tooling.mjs
 *
 * On Linux/macOS (CI, dev container), `npm install` works fine inside the
 * workspace even with the long Vietnamese path. On Windows, scoped packages
 * (eslint, prettier, typescript, vitest, helmet, …) silently fail to install
 * under that path, so we need an ASCII-prefixed copy of the toolchain.
 *
 * This script is the one-shot setup that creates the ASCII-prefixed installs
 * at `C:\tools\*` and wires them back to the workspace as symlinks. Run it
 * after a fresh `npm install` on Windows:
 *
 *     node scripts/install-tooling.mjs
 *
 * On non-Windows it prints a no-op message and exits 0.
 */
import { execSync } from "node:child_process";
import { mkdirSync, existsSync, symlinkSync } from "node:fs";
import { platform } from "node:os";
import path from "node:path";

const isWin = platform() === "win32";
if (!isWin) {
  console.log("[install-tooling] non-Windows host — no shim install needed");
  process.exit(0);
}

const toolsRoot = "C:\\tools";
mkdirSync(toolsRoot, { recursive: true });

/**
 * Toolchain → packages mapping.
 *
 * Each toolchain gets its own prefix to avoid npm peer-dep conflicts (e.g.
 * prettier 3 refuses to coexist with eslint 9 in the same tree).
 */
const toolchains = [
  {
    name: "lint-tools",
    pkgs: [
      "eslint@9.16.0",
      "@eslint/js@9.16.0",
      "@typescript-eslint/eslint-plugin@8.16.0",
      "@typescript-eslint/parser@8.16.0",
      "eslint-plugin-react@7.37.2",
      "eslint-plugin-react-hooks@5.1.0",
      "eslint-plugin-jsx-a11y@6.10.2",
      "eslint-config-prettier@9.1.0",
      "globals@15.0.0",
    ],
    symlinks: [
      ["eslint", "eslint"],
      ["@eslint", "@eslint"],
      ["@typescript-eslint", "@typescript-eslint"],
      ["eslint-config-prettier", "eslint-config-prettier"],
      ["eslint-plugin-jsx-a11y", "eslint-plugin-jsx-a11y"],
      ["eslint-plugin-react", "eslint-plugin-react"],
      ["eslint-plugin-react-hooks", "eslint-plugin-react-hooks"],
      ["globals", "globals"],
    ],
  },
  {
    name: "prettier-tools",
    pkgs: ["prettier@3.4.1"],
    symlinks: [],
  },
  {
    name: "typescript-tools",
    pkgs: ["typescript@5.8.2"],
    symlinks: [["typescript", "typescript"]],
  },
  {
    name: "tsx-tools",
    pkgs: ["tsx@4.22.3"],
    symlinks: [],
  },
  {
    name: "vitest-tools",
    pkgs: ["vitest@3.2.6"],
    symlinks: [],
  },
  {
    name: "security-tools",
    pkgs: ["helmet@8.1.0", "cors@2.8.5", "express-rate-limit@7.5.1"],
    symlinks: [
      ["helmet", "helmet"],
      ["cors", "cors"],
      ["express-rate-limit", "express-rate-limit"],
    ],
  },
  {
    name: "main-deps",
    pkgs: [
      "vite@6.2.3",
      "@vitejs/plugin-react@5.0.4",
      "vite-plugin-pwa@1.3.0",
    ],
    symlinks: [
      ["vite", "vite"],
      ["@vitejs", "@vitejs"],
      ["vite-plugin-pwa", "vite-plugin-pwa"],
    ],
  },
];

for (const tc of toolchains) {
  const prefix = path.join(toolsRoot, tc.name);
  mkdirSync(prefix, { recursive: true });
  console.log(`[install-tooling] installing ${tc.pkgs.length} pkgs into ${prefix}`);
  execSync(
    `npm install --prefix "${prefix}" --no-audit --no-fund --legacy-peer-deps ${tc.pkgs.join(" ")}`,
    { stdio: "inherit" },
  );
  for (const [target, source] of tc.symlinks) {
    const linkPath = path.join("node_modules", target);
    const sourcePath = path.join(prefix, "node_modules", source);
    if (!existsSync(sourcePath)) {
      console.warn(`[install-tooling] WARN: ${sourcePath} missing — skipping symlink`);
      continue;
    }
    try {
      if (existsSync(linkPath) || /symlink/i.test(require("fs").lstatSync(linkPath)?.type?.() ?? "")) {
        // best-effort: rmSync equivalent
        require("node:fs").rmSync(linkPath, { recursive: true, force: true });
      }
    } catch (_e) {
      // ignore — link may not exist
    }
    const rel = path.relative(path.dirname(linkPath), sourcePath);
    symlinkSync(rel, linkPath, "dir");
    console.log(`[install-tooling] symlinked ${linkPath} → ${rel}`);
  }
}

// Copy vitest.cmd shim into node_modules\.bin so `npm test` resolves it.
const vitestSrc = path.join(toolsRoot, "vitest-tools", "node_modules", ".bin", "vitest.cmd");
const vitestDst = path.join("node_modules", ".bin", "vitest.cmd");
mkdirSync(path.dirname(vitestDst), { recursive: true });
if (existsSync(vitestSrc)) {
  require("node:fs").copyFileSync(vitestSrc, vitestDst);
  console.log(`[install-tooling] copied vitest.cmd shim → ${vitestDst}`);
}

console.log("[install-tooling] done");