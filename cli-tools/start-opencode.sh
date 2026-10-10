#!/bin/bash

# Script to run the opencode-ai postinstall script and start opencode on port 23881

OPENCODE_DIR="$HOME/.local/share/pnpm/global/5/.pnpm/opencode-ai@1.18.2/node_modules/opencode-ai"

echo "Running postinstall script in $OPENCODE_DIR..."
cd "$OPENCODE_DIR" || { echo "Could not navigate to $OPENCODE_DIR."; exit 1; }
node postinstall.mjs || { echo "Postinstall script failed."; exit 1; }

echo "Postinstall script completed successfully."

echo "Starting opencode on port 23881..."
opencode --port 23881