#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# MACCHA — Sync and Publish Local Improvements back to GitHub
# ============================================================
# This script copies updated local tools and infrastructure 
# scripts into the repository folder, preparing them (after PII checks)
# to be safely committed and pushed back to the public repository.
# ============================================================

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="${HOME:-/home/$(whoami)}"
DRY_RUN=false

# Local-only file exclusions (gitignored): one filename or glob per line, '#' comments.
# Keeps personal/one-off filenames out of the committed publish.sh itself.
SKIP_FILE="$REPO_DIR/.publish-skip"
is_skipped() {
    local name="$1" pat
    [ -f "$SKIP_FILE" ] || return 1
    while IFS= read -r pat; do
        [ -z "$pat" ] && continue
        case "$pat" in \#*) continue ;; esac
        # shellcheck disable=SC2254
        case "$name" in $pat) return 0 ;; esac
    done < "$SKIP_FILE"
    return 1
}

# Premium ANSI Terminal Colors
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RED="\033[31m"
BOLD="\033[1m"
RESET="\033[0m"

if [ "${1:-}" = "--dry-run" ]; then
    DRY_RUN=true
    echo -e "${YELLOW}${BOLD}>>> DRY RUN — No files will actually be copied <<<${RESET}"
fi

echo -e "${CYAN}${BOLD}======================================================${RESET}"
echo -e "${CYAN}${BOLD}     📤 MACCHA — Publish Local Updates to Repo        ${RESET}"
echo -e "${CYAN}${BOLD}======================================================${RESET}"
echo -e "  ${BLUE}Source (Local) : ${YELLOW}$HOME_DIR${RESET}"
echo -e "  ${BLUE}Destination    : ${YELLOW}$REPO_DIR${RESET}"
echo -e "${CYAN}${BOLD}======================================================${RESET}"
echo ""

# === Helper: kopieer directory-inhoud ===
# copy_dir <bron> <doel_in_repo>
# Alleen bestanden, geen mappen (flat copy voor bin/)
copy_dir_flat() {
    local src="$1" dst_repo="$2"
    local dst="$REPO_DIR/$dst_repo"
    mkdir -p "$dst"
    
    for item in "$src"/*; do
        [ -f "$item" ] || continue  # skip dirs
        local name=$(basename "$item")
        
        # PII Protection: skip personal / one-off local files listed in .publish-skip.
        if is_skipped "$name"; then
            echo "  ⚠️  Skipping local-only file: $name"
            continue
        fi
        
        if $DRY_RUN; then
            echo "  [DRY] cp $item -> $dst/$name"
        else
            cp "$item" "$dst/$name"
            echo "  ✓ $dst_repo/$name"
        fi
    done
}

# === Helper: kopieer directory recursief ===
copy_dir_recursive() {
    local src="$1" dst_repo="$2"
    local dst="$REPO_DIR/$dst_repo"
    mkdir -p "$dst"
    
    if $DRY_RUN; then
        echo "  [DRY] cp -r $src/* -> $dst/"
    else
        # rsync-achtig: kopieer alles, maar overschrijf alleen wat nieuwer is
        cp -ru "$src"/* "$dst/" 2>/dev/null || true
        echo "  ✓ $dst_repo/ (gesynchroniseerd)"
    fi
}

echo ""
echo -e "${CYAN}${BOLD}🧠 [1/4] Syncing CLI Tools...${RESET}"
copy_dir_flat "$HOME_DIR/bin" "cli-tools"
echo -e "  ${YELLOW}(Note: antigravity scripts are skipped — local only)${RESET}"

echo ""
echo -e "${CYAN}${BOLD}📂 [2/4] Syncing Infrastructure Bridges...${RESET}"
copy_dir_flat "$HOME_DIR/INFRA" "infrastructure"
copy_dir_recursive "$HOME_DIR/INFRA/maintenance" "infrastructure/maintenance"
echo -e "  ${YELLOW}(Note: INFRA subdirectories are skipped — only top-level files + maintenance/)${RESET}"

echo ""
echo -e "${CYAN}${BOLD}🧠 [3/4] Syncing Brain Memory Engine...${RESET}"
copy_dir_recursive "$HOME_DIR/INFRA/agents-brain/lib" "brain/lib"

echo ""
echo -e "${CYAN}${BOLD}📚 [4/4] Learned Lessons Policy Registry${RESET}"
echo -e "  ${YELLOW}⚠️  PII-WARNING:${RESET} Learned lessons are ${BOLD}NOT${RESET} automatically copied."
echo -e "     If you have sanitised lessons to publish, copy them manually:"
echo -e "     ${BOLD}cp -r ~/learned-lessons/technical/ repo/learned-lessons/${RESET}"

echo ""
echo -e "${YELLOW}${BOLD}⚠️  PRIVATE DATA SECURITY GATES${RESET}"
echo -e "  Harness configurations (${BLUE}~/AGENTS.md${RESET}, ${BLUE}~/IMPROVEMENT.md${RESET}, ${BLUE}~/BRAIN/*${RESET}) are private."
echo -e "  They will ${RED}${BOLD}NEVER${RESET} be synced by this script to ensure your PII stays completely local."
echo -e "  The templates inside ${BLUE}system-brain/${RESET} will remain clean placeholders."

if $DRY_RUN; then
    echo ""
    echo -e "${YELLOW}>>> DRY RUN COMPLETED — No modifications made <<<${RESET}"
    exit 0
fi

# === Sanitization scope ===
# Only the synced content dirs are sanitized and gated — never publish.sh / README / .git.
SYNC_DIRS=("cli-tools" "infrastructure" "brain")
SANITIZE_RULES="$REPO_DIR/.publish-sanitize.sed"   # local-only (gitignored): holds personal tokens
PII_WORDS="$REPO_DIR/.publish-pii-words"           # local-only (gitignored): one identifier per line

# === PII Sanitization Pass ===
# publish.sh copies scripts verbatim; the local versions legitimately reference
# the owner's personal folder names. The rewrite rules live in a gitignored file
# so the literal personal tokens never appear in the committed publish.sh itself.
echo ""
echo -e "${CYAN}${BOLD}🧼 PII Sanitization Pass${RESET}"
if [ -f "$SANITIZE_RULES" ]; then
    for d in "${SYNC_DIRS[@]}"; do
        [ -d "$REPO_DIR/$d" ] || continue
        find "$REPO_DIR/$d" -type f \( -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.mjs" -o -name "*.txt" -o ! -name "*.*" \) -print0 \
            | xargs -0 -r sed -i -f "$SANITIZE_RULES"
    done
    echo -e "  ${GREEN}✓${RESET} Applied rules from .publish-sanitize.sed"
else
    echo -e "  ${YELLOW}⚠️  No .publish-sanitize.sed found — skipping rewrite (relying on the gate below).${RESET}"
fi

# Strip personal, non-generic blocks marked LOCAL-ONLY in the source scripts.
# Wrap such a block locally with:  # >>> LOCAL-ONLY  ...  # <<< LOCAL-ONLY
for d in "${SYNC_DIRS[@]}"; do
    [ -d "$REPO_DIR/$d" ] || continue
    find "$REPO_DIR/$d" -type f \( -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.mjs" -o -name "*.txt" -o ! -name "*.*" \) -print0 \
        | xargs -0 -r sed -i '/# >>> LOCAL-ONLY/,/# <<< LOCAL-ONLY/d'
done
echo -e "  ${GREEN}✓${RESET} Stripped any LOCAL-ONLY blocks."

# === Hard PII Gate ===
# Abort before any commit if a personal identifier or hardcoded home path survived.
echo ""
echo -e "${CYAN}${BOLD}🚨 Hard PII Gate${RESET}"
GATE_DIRS=()
for d in "${SYNC_DIRS[@]}"; do [ -d "$REPO_DIR/$d" ] && GATE_DIRS+=("$REPO_DIR/$d"); done
LEAK=0
# 1) Hardcoded home paths in any synced file. -r scans all files (incl. extension-less
#    scripts like session-startup); -I skips binaries. Reliable single-grep exit code.
if grep -rnIE "/home/[a-z0-9_-]+/" "${GATE_DIRS[@]}" 2>/dev/null; then
    LEAK=1
fi
# 2) Personal identifiers listed in the local wordlist.
if [ -f "$PII_WORDS" ]; then
    while IFS= read -r word; do
        [ -z "$word" ] && continue
        if grep -rniw "$word" "${GATE_DIRS[@]}" 2>/dev/null; then LEAK=1; fi
    done < "$PII_WORDS"
fi
if [ "$LEAK" -ne 0 ]; then
    echo -e "  ${RED}${BOLD}✗ PII LEAK DETECTED — aborting before commit (see lines above).${RESET}"
    exit 1
fi
echo -e "  ${GREEN}✓${RESET} No personal identifiers or hardcoded home paths in synced content."

# === Hard Language Gate ===
# The public repo must stay English. publish.sh copies local scripts verbatim and
# the local source is Dutch — so abort if a Dutch marker word survives into a synced
# file. Mirrors the PII gate: a silent language regression becomes a loud, blocking stop.
# (Words are distinctly Dutch and chosen not to collide with English; tune as needed.)
echo ""
echo -e "${CYAN}${BOLD}🌐 Hard Language Gate (English-only)${RESET}"
DUTCH_WORDS="niet geen bestand bestanden geheugen wekelijks wekelijkse verwijder verwijderen verwijderd opschonen opgeschoond voltooid mislukt gevonden sleutel gebruiker overgeslagen waarschuwing melding gekopieerd kopiëren onderzoek handleiding telefoon succesvol afgerond leegmaken bewaar zonder analyseren verlopen pagina gewijzigd beschikbaar huidige downloaden installatie verbinding bezig ophalen opslaan bijwerken controleert controleren vereist voorbeeld geïnstalleerd geinstalleerd aanmaken starten gebruik"
NL=0
for word in $DUTCH_WORDS; do
    if grep -rnwIiE "$word" "${GATE_DIRS[@]}" 2>/dev/null; then NL=1; fi
done
if [ "$NL" -ne 0 ]; then
    echo -e "  ${RED}${BOLD}✗ DUTCH DETECTED — aborting (translate the lines above to English before publishing).${RESET}"
    exit 1
fi
echo -e "  ${GREEN}✓${RESET} No Dutch marker words in synced content."

# === Git ===
echo ""
echo -e "${CYAN}${BOLD}🐙 Git Repository Integrity Check${RESET}"
cd "$REPO_DIR"

# Check if there are differences
if git diff --quiet && git diff --cached --quiet; then
    echo -e "  ${GREEN}✓${RESET} No modifications found to commit."
else
    echo -e "  ${YELLOW}⚠️${RESET} Modifications detected:"
    git status --short
    echo ""
    
    # Prompt user
    echo -e "${BOLD}Would you like to commit and push these modifications? (y/n):${RESET} "
    read -r answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        echo -e "${BOLD}Enter commit message:${RESET} "
        read -r msg
        if [ -z "$msg" ]; then
            msg="Update MACCHA engine $(date +%Y-%m-%d)"
        fi
        
        git add -A
        git commit -m "$msg"
        git push origin main
        echo -e "  ${GREEN}✓${RESET} Successfully pushed to GitHub!"
    else
        echo -e "  ${YELLOW}~${RESET} Changes staged locally but not pushed."
        echo -e "  Manual sequence: ${BOLD}git add -A && git commit -m \"...\" && git push${RESET}"
    fi
fi

echo ""
echo -e "${GREEN}${BOLD}======================================================${RESET}"
echo -e "${GREEN}${BOLD}        ✅ MACCHA SYSTEM PUBLISH COMPLETED!           ${RESET}"
echo -e "${GREEN}${BOLD}======================================================${RESET}"
echo ""
