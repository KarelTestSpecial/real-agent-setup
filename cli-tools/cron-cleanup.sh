#!/bin/bash
# ==============================================================================
# Script: cron-cleanup.sh
# Purpose: Fully automated, non-interactive background cleanup.
#          Specifically designed to run safely via cron without hanging.
# ==============================================================================

LOG_FILE="${HOME}/.gemini/antigravity-ide/brain/cron-cleanup.log"
exec > >(tee -i -a "$LOG_FILE") 2>&1

echo "======================================================================"
echo "🕒 Starting automated maintenance run: $(date)"
echo "======================================================================"

# 1. Clean up Google Antigravity (browser recordings & brain history > 30 days)
echo "🧹 Cleaning Antigravity environment..."
if [ -d "${HOME}/.gemini/antigravity/browser_recordings" ]; then
    echo "  -> Removing temporary browser recordings (large)..."
    rm -rf ${HOME}/.gemini/antigravity/browser_recordings/*
fi

if [ -d "${HOME}/.gemini/antigravity/brain" ]; then
    echo "  -> Archiving/removing brain history older than 30 days..."
    find ${HOME}/.gemini/antigravity/brain/ -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
fi

# 2. Clear APT cache (100% safe)
echo "📦 Cleaning APT install cache..."
sudo apt-get clean

# 3. Prune PNPM store (floating npm files)
if command -v pnpm &> /dev/null; then
    echo "📦 Pruning PNPM store..."
    pnpm store prune
fi

# 4. Trim systemd journal logs to a maximum of 3 days
echo "📓 Vacuuming systemd journal logs to 3 days..."
sudo journalctl --vacuum-time=3d

# 5. Clear user cache (free space)
echo "🗑️  Cleaning temporary caches..."
rm -rf ${HOME}/.cache/*

# 6. Model warm-up (once per 30 days to keep Vertex AI models active)
echo "🔮 Checking Vertex AI model warm-up status..."
WARMUP_TIME_FILE="${HOME}/.gemini/antigravity-ide/brain/last-warmup-timestamp"
CURRENT_WARMUP_TIME=$(date +%s)
LAST_WARMUP_TIME=0
if [ -f "$WARMUP_TIME_FILE" ]; then
    LAST_WARMUP_TIME=$(cat "$WARMUP_TIME_FILE" 2>/dev/null || echo 0)
fi

# 30 days in seconds = 2592000
if (( CURRENT_WARMUP_TIME - LAST_WARMUP_TIME > 2592000 )); then
    echo "   -> More than 30 days ago. Waking Gemini models on Vertex..."
    echo "$CURRENT_WARMUP_TIME" > "$WARMUP_TIME_FILE"
    ${HOME}/.local/bin/uv run --with google-genai python3 ${HOME}/scratch/warmup_vertex.py
else
    DAYS_LEFT=$(( (2592000 - (CURRENT_WARMUP_TIME - LAST_WARMUP_TIME)) / 86400 ))
    echo "   -> Models were recently activated. Next warm-up in ~${DAYS_LEFT} days."
fi

echo "======================================================================"
echo "✅ Maintenance run completed successfully: $(date)"
echo "   Log updated in: $LOG_FILE"
echo "======================================================================"
