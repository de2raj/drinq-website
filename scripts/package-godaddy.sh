#!/usr/bin/env bash
# Builds the site and makes deploy/drinq-site.zip for GoDaddy cPanel "Setup Node.js App".
# Usage: npm run package:godaddy
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node/bin:$PATH"

rm -rf .next/standalone
export STANDALONE=1 DB_PROVIDER=sqlite
node scripts/prepare-db.mjs
npx next build

OUT=deploy/drinq-site
rm -rf "$OUT" deploy/drinq-site.zip
mkdir -p "$OUT"
cp -R .next/standalone/. "$OUT/"
mkdir -p "$OUT/.next"
cp -R .next/static "$OUT/.next/static"
cp -R public "$OUT/public"

# Prisma's database engines for Linux (the build only traces the Mac one).
mkdir -p "$OUT/node_modules/.prisma/client"
cp node_modules/.prisma/client/*.so.node "$OUT/node_modules/.prisma/client/"
cp node_modules/.prisma/client/schema.prisma "$OUT/node_modules/.prisma/client/"

# Never ship local settings or databases: GoDaddy's settings go in cPanel.
find "$OUT" -maxdepth 2 \( -name ".env" -o -name ".env.*" -o -name "*.db" -o -name "*.db-journal" \) -print -delete
rm -f "$OUT/node_modules/.prisma/client/"*darwin* "$OUT/node_modules/.prisma/client/"*debian*
# Trim what this site never uses on the server: Mac image binaries and other databases' engines.
rm -rf "$OUT/node_modules/@img" "$OUT/node_modules/sharp"
find "$OUT/node_modules/@prisma/client/runtime" \( -name "*wasm*" -o -name "edge*" -o -name "react-native*" -o -name "*.map" -o -name "index-browser*" \) -delete

( cd "$OUT" && zip -qr ../drinq-site.zip . -x "*.DS_Store" )
echo
echo "Ready: deploy/drinq-site.zip ($(du -h deploy/drinq-site.zip | cut -f1)). Start-up file: server.js"
