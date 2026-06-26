#!/bin/bash
# ==============================================================================
# Script: clean-prune-purge.sh
# Description: System-wide cleanup (apt, pnpm store and optionally trash).
# ==============================================================================

echo "🧹 Cleaning system and pnpm store..."

# Clean apt
sudo apt autoremove --purge -y
sudo apt clean

# Prune PNPM store
if command -v pnpm &> /dev/null; then
    pnpm store prune
fi

# Optional: empty the trash
TRASH_DIR="$HOME/.local/share/Trash"
if [ -d "$TRASH_DIR" ]; then
    read -p "🗑️  Empty the trash as well? (y/N): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo "Emptying trash..."
        rm -rf "$TRASH_DIR/files"/* "$TRASH_DIR/info"/*
        echo "✅ Trash emptied."
    else
        echo "⏭️  Skipping trash."
    fi
fi

echo "✅ System cleaned."
