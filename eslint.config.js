// ESLint v9 flat config. Works with our TS+TSX project (React 19 + Node 22).
// The legacy .eslintrc.json was retained for backwards-compat with any IDE
// plugin that still reads it; the flat config is authoritative.
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";

export default [
  // Global ignores — dist, node_modules, generated artifacts.
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "public/**",
      "coverage/**",
      "**/*.cjs",
      "**/*.d.ts",
      "scripts/check-duplicate-paths.mjs",
      "vitest.config.ts",
      "vitest.setup.ts",
      "vitest.node-test-bridge.ts",
      "vite.config.ts",
      // Generated bridge for node:test → vitest collection.
    ],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "server/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        WebAssembly: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Blob: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
        crypto: "readonly",
        self: "readonly",
        Worker: "readonly",
        SharedArrayBuffer: "readonly",
        Atomics: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        // Node globals
        process: "readonly",
        Buffer: "readonly",
        global: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        queueMicrotask: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "react/prop-types": "off",
      "no-undef": "off", // TS handles this
    },
  },
  prettier,
];