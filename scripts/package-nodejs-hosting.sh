#!/usr/bin/env bash
# Makes deploy/drinq-source.zip for GoDaddy Node.js Hosting ("Upload a zip").
# GoDaddy installs, builds (npm run build) and starts (npm start) it itself.
# Only files tracked or addable in git go in: never .env, databases, node_modules or builds.
# Usage: npm run package:nodejs
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f deploy/drinq-source.zip
mkdir -p deploy
git ls-files -co --exclude-standard \
  | grep -vE '^(mockups/|assets/|deploy/|\.claude/)' \
  | grep -vE '(^|/)\.env($|\.)|\.db$' \
  > deploy/.files
grep -q '^\.env\.example$' <(git ls-files) && echo ".env.example" >> deploy/.files
zip -q deploy/drinq-source.zip -@ < deploy/.files
rm deploy/.files
echo "Ready: deploy/drinq-source.zip ($(du -h deploy/drinq-source.zip | cut -f1), $(unzip -l deploy/drinq-source.zip | tail -1 | awk '{print $2}') files)"
