#!/bin/bash
# ==============================================================================
# Script: cron-cleanup.sh
# Goal: Fully automated, non-interactive background cleanup.
#       Specially designed to run safely via cron without hanging.
# ==============================================================================

LOG_FILE="${HOME}/.gemini/antigravity-ide/brain/cron-cleanup.log"
exec > >(tee -i -a "$LOG_FILE") 2>&1

echo "======================================================================"
echo "🕒 Starting automated maintenance run: $(date)"
echo "======================================================================"

# 1. Clean up Google Antigravity (browser recordings & brain history > 30 days)
echo "🧹 Cleaning Antigravity environment..."
if [ -d "${HOME}/.gemini/antigravity/browser_recordings" ]; then
    echo "  -> Deleting temporary browser recordings (large)..."
    rm -rf ${HOME}/.gemini/antigravity/browser_recordings/*
fi

if [ -d "${HOME}/.gemini/antigravity/brain" ]; then
    echo "  -> Archiving/deleting brain history older than 30 days..."
    find ${HOME}/.gemini/antigravity/brain/ -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
fi

# 2. Empty the APT cache (100% safe)
echo "📦 Cleaning APT installation cache..."
sudo apt-get clean

# 3. Clean the PNPM store (dangling npm files)
if command -v pnpm &> /dev/null; then
    echo "📦 Pruning PNPM store..."
    pnpm store prune
fi

# 4. Trim systemd journal logs to at most 3 days
echo "📓 Vacuuming systemd journal logs to 3 days..."
sudo journalctl --vacuum-time=3d

# 5. Clean the user cache (free space)
echo "🗑️  Cleaning temporary caches..."
rm -rf ${HOME}/.cache/*

# 6. Model warm-up (1x per 30 days to keep Vertex AI models active)
echo "🔮 Checking Vertex AI model warm-up status..."
WARMUP_TIME_FILE="${HOME}/.gemini/antigravity-ide/brain/last-warmup-timestamp"
CURRENT_WARMUP_TIME=$(date +%s)
LAST_WARMUP_TIME=0
if [ -f "$WARMUP_TIME_FILE" ]; then
    LAST_WARMUP_TIME=$(cat "$WARMUP_TIME_FILE" 2>/dev/null || echo 0)
fi

# 30 days in seconds = 2592000
if (( CURRENT_WARMUP_TIME - LAST_WARMUP_TIME > 2592000 )); then
    echo "   -> More than 30 days ago. Waking up Gemini models on Vertex..."
    echo "$CURRENT_WARMUP_TIME" > "$WARMUP_TIME_FILE"
    ${HOME}/.local/bin/uv run --with google-genai python3 ${HOME}/scratch/warmup_vertex.py
else
    DAYS_LEFT=$(( (2592000 - (CURRENT_WARMUP_TIME - LAST_WARMUP_TIME)) / 86400 ))
    echo "   -> Models were activated recently. Next warm-up in ~${DAYS_LEFT} days."
fi

echo "======================================================================"
echo "✅ Maintenance run finished successfully: $(date)"
echo "   Log updated at: $LOG_FILE"
echo "======================================================================"
