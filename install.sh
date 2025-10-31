#!/usr/bin/env bash
set -e
echo "VS Code Termux Panel — Auto Install (final)"
if command -v pkg >/dev/null 2>&1; then PKG=pkg; else PKG=apt; fi
$PKG update -y || true
$PKG install -y nodejs git python unzip curl openssh clang make
npm install -g pm2 --no-fund --no-audit || true
TARGET="$HOME/vscode-termux-panel"
echo "Copying files to $TARGET"
mkdir -p "$TARGET"
cp -r . "$TARGET"
cd "$TARGET/server"
npm install --no-audit --no-fund --silent || true
# try rebuild node-pty if present
if grep -q 'node-pty' package.json 2>/dev/null; then
  npm rebuild node-pty --build-from-source || echo "node-pty build failed; terminal will fallback to echo mode"
fi
cd ../client
npm install --no-audit --no-fund --silent || true
npm run build || echo "Client build may need to be run manually on a more capable machine."
cd "$TARGET"
pm2 start ecosystem.config.js || pm2 start server/server.js --name vscode-termux-server
pm2 save
echo "Done. Open http://localhost:4000"
