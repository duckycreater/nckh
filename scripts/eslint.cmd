@echo off
rem Run ESLint with the locally-installed version at C:\tools\lint-tools.
rem
rem Why this exists: on Windows, paths containing Vietnamese diacritics
rem (the workspace lives under "e:\docx\bmo-robot---phân-loại-rác")
rem confuse npm install when it tries to materialise scoped packages, so
rem we keep a dedicated ASCII-path install of ESLint, Prettier, and
rem TypeScript at C:\tools\* and call them from npm scripts.
rem
rem Prettier 3.x drops ESLint 9 from the same `node_modules` tree (peer
rem conflict), so we use TWO separate install roots: lint-tools (ESLint
rem stack) and prettier-tools (Prettier). typescript-tools hosts TS so
rem @typescript-eslint can resolve `typescript` regardless of where the
rem project workspace lives.
set NODE_PATH=C:\tools\lint-tools\node_modules;C:\tools\typescript-tools\node_modules
node "C:\tools\lint-tools\node_modules\eslint\bin\eslint.js" %*