#!/bin/bash
# ==============================================================================
# Script: clean-prune-purge.sh
# Description: System-wide cleanup (apt, pnpm store and optionally the trash).
# ==============================================================================

echo "🧹 Clean up van systeem en pnpm store..."

# Apt clean
sudo apt autoremove --purge -y
sudo apt clean

# PNPM store clean
if command -v pnpm &> /dev/null; then
    pnpm store prune
fi

# Optional: empty the trash
TRASH_DIR="$HOME/.local/share/Trash"
if [ -d "$TRASH_DIR" ]; then
    read -p "🗑️  Also empty the trash? (y/N): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo "Emptying trash..."
        rm -rf "$TRASH_DIR/files"/* "$TRASH_DIR/info"/*
        echo "✅ Trash emptied."
    else
        echo "⏭️  Skipping trash."
    fi
fi

echo "✅ Systeem is cleaned up."
