#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

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
CHECK_ONLY=false

# Explicit publish curation (tracked, unlike the two local gate configs).
# Fail-closed: an absent allowlist aborts the copy phase instead of shipping
# every local script by accident.
ALLOWLIST="$REPO_DIR/.publish-allowlist"
SKIPPED=0

# Local-only gate configs (gitignored): .publish-sanitize.sed and .publish-pii-words.
# They are read further down; keeping personal tokens out of this committed script.
# Curation itself is NOT local: it lives in the tracked .publish-allowlist above.
# Premium ANSI Terminal Colors
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RED="\033[31m"
BOLD="\033[1m"
RESET="\033[0m"

for arg in "$@"; do
    case "$arg" in
        --dry-run)    DRY_RUN=true ;;
        --check-only) CHECK_ONLY=true ;;
        *) echo -e "${RED}${BOLD}Unknown option: $arg${RESET} (use --dry-run or --check-only)"; exit 2 ;;
    esac
done

if $DRY_RUN; then
    echo -e "${YELLOW}${BOLD}>>> DRY RUN — No files will actually be copied <<<${RESET}"
fi
if $CHECK_ONLY; then
    echo -e "${YELLOW}${BOLD}>>> CHECK-ONLY — gates run, nothing is copied or committed <<<${RESET}"
fi

echo -e "${CYAN}${BOLD}======================================================${RESET}"
echo -e "${CYAN}${BOLD}     📤 MACCHA — Publish Local Updates to Repo        ${RESET}"
echo -e "${CYAN}${BOLD}======================================================${RESET}"
echo -e "  ${BLUE}Source (Local) : ${YELLOW}$HOME_DIR${RESET}"
echo -e "  ${BLUE}Destination    : ${YELLOW}$REPO_DIR${RESET}"
echo -e "${CYAN}${BOLD}======================================================${RESET}"
echo ""

# === Helper: is this destination allowed to ship? ===
# Reads .publish-allowlist: one repo-relative path per line, '#' comments.
# A path naming a directory permits every path beneath it.
publish_allowed() {
    local want="$1" line
    while IFS= read -r line || [ -n "$line" ]; do
        line="${line%%#*}"
        line="${line#"${line%%[![:space:]]*}"}"
        line="${line%"${line##*[![:space:]]}"}"
        if [ -z "$line" ]; then continue; fi
        if [ "$line" = "$want" ]; then return 0; fi
        case "$want" in
            "$line"/*) return 0 ;;
        esac
    done < "$ALLOWLIST"
    return 1
}

publish_skip() {
    local rel="$1"
    echo -e "  ${YELLOW}⊘ $rel — not in .publish-allowlist, skipped (add that line to publish it)${RESET}"
    SKIPPED=$((SKIPPED + 1))
}

# === Helper: kopieer directory-inhoud ===
# copy_dir <bron> <doel_in_repo>
# Alleen bestanden, geen mappen (flat copy voor bin/)
copy_dir_flat() {
    local src="$1" dst_repo="$2"
    local dst="$REPO_DIR/$dst_repo"
    if [ ! -d "$src" ]; then
        echo -e "  ${YELLOW}⚠️  Source not found: $src (skipped)${RESET}"
        return
    fi
    mkdir -p "$dst"
    
    for item in "$src"/*; do
        [ -f "$item" ] || continue  # skip dirs
        local name=$(basename "$item")
        
        if ! publish_allowed "$dst_repo/$name"; then
            publish_skip "$dst_repo/$name"
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
    if [ ! -d "$src" ]; then
        echo -e "  ${YELLOW}⚠️  Source not found: $src (skipped)${RESET}"
        return
    fi
    if ! publish_allowed "$dst_repo"; then
        publish_skip "$dst_repo/"
        return
    fi
    mkdir -p "$dst"
    local items=("$src"/*)
    if [ "${#items[@]}" -eq 0 ]; then
        echo -e "  ${YELLOW}⚠️  No files in $src (skipped)${RESET}"
        return
    fi
    
    if $DRY_RUN; then
        echo "  [DRY] cp -r $src/* -> $dst/"
    else
        # Publish semantics: local is the source of truth here — always refresh,
        # and dereference symlinks so the repo never receives a personal absolute
        # symlink target. (Previously 'cp -ru' silently skipped files whose local
        # mtime was older than the sanitized repo copy, causing stale drift.)
        # Skip items whose symlink-resolved source IS the repo destination: the
        # brain/lib engine is loaded through a runtime symlink that points into
        # this repo (single source), so a same-file cp would abort the whole
        # publish under `set -e` — and with it the PII gates + publish marker.
        local same=() copy_items=()
        for item in "${items[@]}"; do
            local base; base="$(basename "$item")"
            local resolved_src resolved_dst
            resolved_src="$(realpath "$item")"
            resolved_dst="$(realpath "$dst/$base" 2>/dev/null || echo "$dst/$base")"
            if [ "$resolved_src" = "$resolved_dst" ]; then
                same+=("$base")
            else
                copy_items+=("$item")
            fi
        done
        if [ "${#same[@]}" -gt 0 ]; then
            echo "  • $dst_repo/: ${same[*]} already the same file (runtime symlink single source) — skipped"
        fi
        if [ "${#copy_items[@]}" -gt 0 ]; then
            cp -rfL "${copy_items[@]}" "$dst/"
        fi
        echo "  ✓ $dst_repo/ (gesynchroniseerd)"
    fi
}

if ! $CHECK_ONLY; then
if [ ! -f "$ALLOWLIST" ]; then
    echo -e "\n${RED}${BOLD}✗ .publish-allowlist is missing — refusing to publish without curation.${RESET}"
    echo -e "  Restore it from git (${BOLD}git checkout -- .publish-allowlist${RESET}) so local"
    echo -e "  scripts cannot reach the public repo by accident."
    exit 1
fi

echo ""
echo -e "${CYAN}${BOLD}🧠 [1/4] Syncing CLI Tools...${RESET}"
copy_dir_flat "$HOME_DIR/bin/maccha" "cli-tools"
echo -e "  ${YELLOW}(Note: only .publish-allowlist entries are copied — everything else is reported below)${RESET}"

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
if [ "$SKIPPED" -gt 0 ]; then
    echo -e "  ${YELLOW}${BOLD}$SKIPPED local file(s) NOT published${RESET} (not in ${BLUE}.publish-allowlist${RESET})."
    echo -e "  That is the intended default: nothing becomes public without a deliberate line."
else
    echo -e "  ${GREEN}All local files in the sync scope are allowlisted.${RESET}"
fi
fi

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
        find "$REPO_DIR/$d" -type f \( -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.mjs" -o -name "*.txt" -o -name "*.md" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o ! -name "*.*" \) -print0 \
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
    find "$REPO_DIR/$d" -type f \( -name "*.sh" -o -name "*.py" -o -name "*.js" -o -name "*.mjs" -o -name "*.txt" -o -name "*.md" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o ! -name "*.*" \) -print0 \
        | xargs -0 -r sed -i '/# >>> LOCAL-ONLY/,/# <<< LOCAL-ONLY/d'
done
echo -e "  ${GREEN}✓${RESET} Stripped any LOCAL-ONLY blocks."

# === Hard PII Gate ===
# Abort before any commit if a personal identifier or hardcoded home path survived.
# Scans ALL tracked files — not just the synced dirs. A stale tracked file outside
# the sync scope (e.g. a leftover .backup of a gitignored config, or a system-brain
# template) is exactly how a leak slipped through before. Enumerating via git keeps
# the gitignored local config (.publish-sanitize.sed etc.) out of scope.
# `--others --exclude-standard` also covers files that are not tracked *yet*: a file
# this run just copied in is untracked at gate time, and scanning tracked files only
# would let a brand-new personal script walk straight past this gate.
echo ""
echo -e "${CYAN}${BOLD}🚨 Hard PII Gate${RESET}"
GATE_DIRS=()
for d in "${SYNC_DIRS[@]}"; do [ -d "$REPO_DIR/$d" ] && GATE_DIRS+=("$REPO_DIR/$d"); done
cd "$REPO_DIR"
mapfile -t GATE_FILES < <(git ls-files --cached --others --exclude-standard)
LEAK=0
if [ "${#GATE_FILES[@]}" -eq 0 ]; then
    echo -e "  ${YELLOW}⚠️  No files to scan — skipping PII scan.${RESET}"
else
    # 1) Hardcoded home paths in any tracked file. -I skips binaries.
    if grep -InIE "/home/[a-z0-9_-]+/" "${GATE_FILES[@]}" 2>/dev/null; then
        LEAK=1
    fi
    # 2) Personal identifiers listed in the local wordlist (whole-word, case-insensitive).
    if [ -f "$PII_WORDS" ]; then
        while IFS= read -r word; do
            [ -z "$word" ] && continue
            if grep -IniwE "$word" "${GATE_FILES[@]}" 2>/dev/null; then LEAK=1; fi
        done < "$PII_WORDS"
    fi
fi
if [ "$LEAK" -ne 0 ]; then
    echo -e "  ${RED}${BOLD}✗ PII LEAK DETECTED — aborting before commit (see lines above).${RESET}"
    exit 1
fi
echo -e "  ${GREEN}✓${RESET} No personal identifiers or hardcoded home paths in tracked files."

# === Hard Language Gate ===
# The public repo must stay English. publish.sh copies local scripts verbatim and
# the local source is Dutch — so abort if a Dutch marker word survives into a synced
# file. Mirrors the PII gate: a silent language regression becomes a loud, blocking stop.
# (Words are distinctly Dutch and chosen not to collide with English; tune as needed.)
echo ""
echo -e "${CYAN}${BOLD}🌐 Hard Language Gate (English-only)${RESET}"
DUTCH_WORDS="niet geen bestand bestanden geheugen wekelijks wekelijkse verwijder verwijderen verwijderd opschonen opgeschoond voltooid mislukt gevonden sleutel gebruiker overgeslagen waarschuwing melding gekopieerd kopiëren onderzoek handleiding telefoon succesvol afgerond leegmaken bewaar zonder analyseren verlopen pagina gewijzigd beschikbaar huidige downloaden installatie verbinding bezig ophalen opslaan bijwerken controleert controleren vereist voorbeeld geïnstalleerd geinstalleerd aanmaken starten gebruik enkel alleen bestaat bestaan overslaan overslaat paden oudste nieuwste fysieke uitleesbaar ingesteld gearchiveerd wordt deze zijn maar ook naar heeft haar hun onze tot nog als hier moeten kunnen alle elke veel meer een het geeft lijst kale veld velden regel regels systeem fout fouten meldingen"
# The marker list is a proxy, not a curator: it cannot know every Dutch word.
# What it CAN do is make the exception explicit instead of accidental.
# tms_shortlist_sync.py ships a Dutch stopword list for Dutch-language text
# analysis — that is its function, not a leftover. One file, by name.
GATE_EXCLUDE_FILES=(tms_shortlist_sync.py)
GATE_EXCLUDE_ARGS=()
for f in "${GATE_EXCLUDE_FILES[@]}"; do GATE_EXCLUDE_ARGS+=(--exclude="$f"); done
NL=0
for word in $DUTCH_WORDS; do
    if grep -rnwIiE "${GATE_EXCLUDE_ARGS[@]}" --exclude-dir=node_modules --exclude-dir=__pycache__ --exclude-dir=.git "$word" "${GATE_DIRS[@]}" 2>/dev/null; then NL=1; fi
done
if [ "$NL" -ne 0 ]; then
    echo -e "  ${RED}${BOLD}✗ DUTCH DETECTED — aborting (translate the lines above to English before publishing).${RESET}"
    exit 1
fi
echo -e "  ${GREEN}✓${RESET} No Dutch marker words in synced content."

# === Check-only mode: stop here ===
if $CHECK_ONLY; then
    echo ""
    echo -e "${GREEN}${BOLD}✅ CHECK-ONLY COMPLETED — all gates passed, nothing copied or committed.${RESET}"
    exit 0
fi

# === Git ===
echo ""
echo -e "${CYAN}${BOLD}🐙 Git Repository Integrity Check${RESET}"
cd "$REPO_DIR"

# Check if there are differences
PUBLISH_OK=0
if git diff --quiet && git diff --cached --quiet; then
    echo -e "  ${GREEN}✓${RESET} No modifications found to commit."
    PUBLISH_OK=1
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
        PUBLISH_OK=1
    else
        echo -e "  ${YELLOW}~${RESET} Changes staged locally but not pushed."
        echo -e "  Manual sequence: ${BOLD}git add -A && git commit -m \"...\" && git push${RESET}"
    fi
fi

# Marker for the publish-drift reminder in tms_integrity_hook.py: the moment
# the local tooling was last known to match the repo.
if [ "$PUBLISH_OK" = "1" ] && [ -d "$HOME_DIR/.config/maccha" ]; then
    date +%s > "$HOME_DIR/.config/maccha/last_publish"
    echo -e "  ${GREEN}✓${RESET} Publish marker updated (closeout drift check reads it)."
fi

echo ""
echo -e "${GREEN}${BOLD}======================================================${RESET}"
echo -e "${GREEN}${BOLD}        ✅ MACCHA SYSTEM PUBLISH COMPLETED!           ${RESET}"
echo -e "${GREEN}${BOLD}======================================================${RESET}"
echo ""
