@echo off
rem Run Prettier with the locally-installed version at C:\tools\prettier-tools.
rem See scripts/eslint.cmd for why this is shimmed from an ASCII path.
node "C:\tools\prettier-tools\node_modules\prettier\bin\prettier.cjs" %*