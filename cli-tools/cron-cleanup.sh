#!/bin/bash
# ==============================================================================
# Script: cron-cleanup.sh
# Doel: Volledig geautomatiseerde, not-interactieve achtergrond-opschoning.
#       Specially designed to run safely via cron without hanging.
# ==============================================================================

LOG_FILE="${HOME}/.gemini/antigravity-ide/brain/cron-cleanup.log"
exec > >(tee -i -a "$LOG_FILE") 2>&1

echo "======================================================================"
echo "🕒 Start automatische onderhoudsbeurt: $(date)"
echo "======================================================================"

# 1. Google Antigravity opruimen (Browser opnames & Brain geschiedenis > 30 dagen)
echo "🧹 Antigravity-omgeving clean..."
if [ -d "${HOME}/.gemini/antigravity/browser_recordings" ]; then
    echo "  -> Wissen van tijdelijke browser-opnames (groot)..."
    rm -rf ${HOME}/.gemini/antigravity/browser_recordings/*
fi

if [ -d "${HOME}/.gemini/antigravity/brain" ]; then
    echo "  -> Archiveren/wissen van brain-historie ouder dan 30 dagen..."
    find ${HOME}/.gemini/antigravity/brain/ -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
fi

# 2. APT-cache empty (100% veilig)
echo "📦 Cleaning APT installation cache..."
sudo apt-get clean

# 3. PNPM Store clean (Zwevende npm fileen)
if command -v pnpm &> /dev/null; then
    echo "📦 PNPM Store prunen..."
    pnpm store prune
fi

# 4. Systeem-journal logs inkorten naar maximaal 3 dagen
echo "📓 Systemd journal logs vacuumen tot 3 dagen..."
sudo journalctl --vacuum-time=3d

# 5. Gebruikers cache clean (vrije ruimte)
echo "🗑️  Tijdelijke caches opruimen..."
rm -rf ${HOME}/.cache/*

# 6. Model-warmup (1x per 30 dagen om Vertex AI-modellen actief te houden)
echo "🔮 Checking Vertex AI model warm-up status..."
WARMUP_TIME_FILE="${HOME}/.gemini/antigravity-ide/brain/last-warmup-timestamp"
CURRENT_WARMUP_TIME=$(date +%s)
LAST_WARMUP_TIME=0
if [ -f "$WARMUP_TIME_FILE" ]; then
    LAST_WARMUP_TIME=$(cat "$WARMUP_TIME_FILE" 2>/dev/null || echo 0)
fi

# 30 dagen in seconden = 2592000
if (( CURRENT_WARMUP_TIME - LAST_WARMUP_TIME > 2592000 )); then
    echo "   -> Meer dan 30 dagen geleden. Wekken van Gemini-modellen op Vertex..."
    echo "$CURRENT_WARMUP_TIME" > "$WARMUP_TIME_FILE"
    ${HOME}/.local/bin/uv run --with google-genai python3 ${HOME}/scratch/warmup_vertex.py
else
    DAYS_LEFT=$(( (2592000 - (CURRENT_WARMUP_TIME - LAST_WARMUP_TIME)) / 86400 ))
    echo "   -> Modellen zijn recent geactiveerd. Volgende warm-up over ~${DAYS_LEFT} dagen."
fi

echo "======================================================================"
echo "✅ Onderhoudsbeurt successfully finished: $(date)"
echo "   Logboek bijgewerkt in: $LOG_FILE"
echo "======================================================================"
