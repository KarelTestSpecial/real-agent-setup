#!/bin/bash
# ==============================================================================
# Script: clean-antigravity.sh
# Beschrijving: Ruimt Antigravity op (browser opnames en oude hersen-historie).
# ==============================================================================

echo "Cleaning browser recordings..."
rm -rf "$HOME/.gemini/antigravity/browser_recordings"/*

echo "Cleaning brain history older than 30 days..."
find "$HOME/.gemini/antigravity/brain/" -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +

echo "Antigravity cleanup complete."
