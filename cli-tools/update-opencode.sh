#!/usr/bin/env bash
set -euo pipefail

echo "=== Opencode updater ==="

PNPM_GLOBAL="$HOME/.local/share/pnpm/global/5"

echo "Step 1: Updating Opencode..."
pnpm add -g opencode-ai

echo "Step 2: Running postinstall..."
VERSION_DIR=$(find "$PNPM_GLOBAL/.pnpm" -maxdepth 1 -type d -name "opencode-ai@*" | sort | tail -n1)

if [ -z "$VERSION_DIR" ]; then
    echo "Cannot find opencode-ai."
    exit 1
fi

cd "$VERSION_DIR/node_modules/opencode-ai"
node postinstall.mjs

echo "Step 3: Checking..."

if opencode --version; then
    echo
    echo "✅ Opencode has been updated successfully."
else
    echo
    echo "❌ Opencode failed to start."
    echo "Check:"
    echo "  ls -l $PNPM_GLOBAL/node_modules/opencode-ai"
    exit 1
fi