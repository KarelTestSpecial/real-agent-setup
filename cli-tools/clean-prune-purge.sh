#!/bin/bash
# ==============================================================================
# Script: clean-prune-purge.sh
# Beschrijving: Systeem-brede opschoning (apt, pnpm store en optioneel prullenbak).
# ==============================================================================

echo "🧹 Clean up van systeem en pnpm store..."

# Apt clean
sudo apt autoremove --purge -y
sudo apt clean

# PNPM store clean
if command -v pnpm &> /dev/null; then
    pnpm store prune
fi

# Optioneel: Prullenbak legen
TRASH_DIR="$HOME/.local/share/Trash"
if [ -d "$TRASH_DIR" ]; then
    read -p "🗑️  Wil je ook de prullenbak legen? (y/N): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo "Legen van prullenbak..."
        rm -rf "$TRASH_DIR/files"/* "$TRASH_DIR/info"/*
        echo "✅ Prullenbak is geleegd."
    else
        echo "⏭️  Prullenbak overslaan."
    fi
fi

echo "✅ Systeem is cleaned up."
