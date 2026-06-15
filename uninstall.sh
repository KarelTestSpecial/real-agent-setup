#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# MACCHA — Safe Uninstaller
# ============================================================
# Mirrors setup.sh and removes ONLY the scaffolding files that
# are still byte-for-byte identical to this repo (i.e. untouched
# by you). Any file you have edited — and every personal data
# directory — is left completely in place.
#
#   bash uninstall.sh                 # dry-run: show what WOULD be removed
#   bash uninstall.sh --force         # ask y/N before removing each file
#   bash uninstall.sh --force --yes   # remove pristine files without prompting
# ============================================================

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="${HOME:-/home/$(whoami)}"

CYAN="\033[36m"; GREEN="\033[32m"; YELLOW="\033[33m"
BLUE="\033[34m"; MAGENTA="\033[35m"; RED="\033[31m"; BOLD="\033[1m"; RESET="\033[0m"

FORCE=0; ASSUME_YES=0
for arg in "${@:-}"; do
    case "$arg" in
        --force) FORCE=1 ;;
        --yes|-y) ASSUME_YES=1 ;;
        -h|--help)
            echo "Usage: bash uninstall.sh [--force] [--yes]"
            echo "  (no args)  Dry-run — list pristine files that would be removed."
            echo "  --force    Remove pristine files, asking y/N before each one."
            echo "  --yes      With --force, remove without prompting."
            exit 0 ;;
        "" ) ;;
        *) echo "Unknown option: $arg (try --help)"; exit 1 ;;
    esac
done

# Itemized ledger — every considered artifact lands in exactly one bucket.
INSTALLED=()   # was present on this machine (the install footprint)
REMOVED=()     # pristine + confirmed → deleted
WOULD=()       # pristine, dry-run → would delete
EDITED=()      # present but you changed it → kept
DECLINED=()    # pristine but you answered N → kept
ABSENT=()      # not installed on this machine

# Remove $2 only if identical to repo source $1. cmp -s ignores file
# mode, so the +x that setup.sh adds to bin scripts is not "edited".
consider() {
    local repo="$1" dst="$2"
    [ -e "$repo" ] || return
    if [ ! -e "$dst" ]; then
        ABSENT+=("$dst"); return
    fi
    INSTALLED+=("$dst")
    if ! cmp -s "$repo" "$dst"; then
        echo -e "  ${MAGENTA}[keep]${RESET}    $dst ${BLUE}(edited — left in place)${RESET}"
        EDITED+=("$dst"); return
    fi
    # Pristine.
    if [ "$FORCE" -eq 0 ]; then
        echo -e "  ${YELLOW}[dry-run] would remove${RESET} $dst ${BLUE}(pristine)${RESET}"
        WOULD+=("$dst"); return
    fi
    local reply="n"
    if [ "$ASSUME_YES" -eq 1 ]; then
        reply="y"
    elif [ -t 0 ]; then
        read -r -p "$(echo -e "  ${YELLOW}Delete${RESET} $dst ? [y/N]: ")" reply || reply="n"
    fi
    case "$reply" in
        y|Y|yes|YES)
            rm -f "$dst"
            echo -e "  ${GREEN}✗ removed${RESET} $dst"
            REMOVED+=("$dst") ;;
        *)
            echo -e "  ${BLUE}↷ skipped${RESET} $dst"
            DECLINED+=("$dst") ;;
    esac
}

# Walk every file under repo dir $1, comparing to installed dir $2.
consider_tree() {
    local srcdir="$1" dstdir="$2"
    [ -d "$srcdir" ] || return
    while IFS= read -r -d '' f; do
        consider "$f" "$dstdir/${f#"$srcdir"/}"
    done < <(find "$srcdir" -type f -print0)
}

print_list() {  # $1 = title color+label, rest = items
    local label="$1"; shift
    [ "$#" -gt 0 ] || return
    echo -e "$label ${BOLD}($#)${RESET}"
    local i; for i in "$@"; do echo -e "    $i"; done
}

echo -e "${CYAN}${BOLD}======================================================${RESET}"
echo -e "${CYAN}${BOLD}  🧹 MACCHA — Safe Uninstaller                       ${RESET}"
echo -e "${CYAN}${BOLD}======================================================${RESET}"
if [ "$FORCE" -eq 0 ]; then
    echo -e "  ${YELLOW}DRY-RUN${RESET} — nothing will be deleted. Re-run with ${BOLD}--force${RESET} to apply."
elif [ "$ASSUME_YES" -eq 1 ]; then
    echo -e "  ${RED}${BOLD}LIVE / --yes${RESET} — pristine files removed without prompting."
else
    echo -e "  ${YELLOW}${BOLD}LIVE${RESET} — you will be asked before each deletion."
fi
echo ""

echo -e "${CYAN}${BOLD}🧠 Brain memory engine (code only)${RESET}"
consider_tree "$REPO_DIR/brain/lib" "$HOME_DIR/INFRA/agents-brain/lib"

echo -e "${CYAN}${BOLD}🛠️  CLI utilities (~/bin)${RESET}"
for script in "$REPO_DIR"/cli-tools/*; do
    consider "$script" "$HOME_DIR/bin/$(basename "$script")"
done

echo -e "${CYAN}${BOLD}📂 Infrastructure bridges (~/INFRA)${RESET}"
for f in mydrive-access-tool.js storage-manager.js manual-scrcpy.txt; do
    consider "$REPO_DIR/infrastructure/$f" "$HOME_DIR/INFRA/$f"
done
consider_tree "$REPO_DIR/infrastructure/maintenance" "$HOME_DIR/INFRA/maintenance"

echo -e "${CYAN}${BOLD}📝 Home templates & hooks${RESET}"
for f in AGENTS.md IMPROVEMENT.md done.md in-progress.md todo.md; do
    consider "$REPO_DIR/system-brain/$f" "$HOME_DIR/$f"
done
for hook in "$REPO_DIR"/system-brain/hooks/*.cjs; do
    consider "$hook" "$HOME_DIR/BRAIN/hooks/$(basename "$hook")"
done
consider "$REPO_DIR/system-brain/policies/guardrails.md" "$HOME_DIR/BRAIN/policies/guardrails.md"

echo -e "${CYAN}${BOLD}📚 Seeded placeholders${RESET}"
consider "$REPO_DIR/learned-lessons/README.md" "$HOME_DIR/learned-lessons/README.md"
consider "$REPO_DIR/info/systeem-info/laptop-setup.md" "$HOME_DIR/INFO/systeem-info/laptop-setup.md"

# Tidy up now-empty scaffolding dirs (never personal-data dirs), with confirmation.
if [ "$FORCE" -eq 1 ]; then
    for d in \
        "$HOME_DIR/INFRA/agents-brain/lib" \
        "$HOME_DIR/INFRA/maintenance" \
        "$HOME_DIR/BRAIN/hooks" \
        "$HOME_DIR/BRAIN/policies"; do
        [ -d "$d" ] || continue
        [ -z "$(ls -A "$d" 2>/dev/null)" ] || continue   # only if empty
        reply="n"
        if [ "$ASSUME_YES" -eq 1 ]; then reply="y"
        elif [ -t 0 ]; then read -r -p "$(echo -e "  ${YELLOW}Remove empty dir${RESET} $d ? [y/N]: ")" reply || reply="n"; fi
        case "$reply" in y|Y|yes|YES) rmdir "$d" && echo -e "  ${GREEN}✗ removed empty dir${RESET} $d";; esac
    done
fi

# ---- Itemized report ----------------------------------------------
echo ""
echo -e "${CYAN}${BOLD}======================================================${RESET}"
echo -e "${CYAN}${BOLD}  📋 Report                                          ${RESET}"
echo -e "${CYAN}${BOLD}======================================================${RESET}"
print_list "${BOLD}Installed footprint found on this machine:${RESET}" "${INSTALLED[@]:-}"
echo ""
if [ "$FORCE" -eq 0 ]; then
    print_list "${YELLOW}Would remove (pristine):${RESET}" "${WOULD[@]:-}"
else
    print_list "${GREEN}Uninstalled (removed):${RESET}"      "${REMOVED[@]:-}"
    print_list "${BLUE}Skipped (you answered No):${RESET}"    "${DECLINED[@]:-}"
fi
print_list "${MAGENTA}Kept (edited by you):${RESET}" "${EDITED[@]:-}"

echo ""
echo -e "${YELLOW}Preserved on purpose — review/remove manually if you wish:${RESET}"
echo -e "  • ${BLUE}~/INFRA/agents-brain/data${RESET}  (your memory store)"
echo -e "  • ${BLUE}~/BRAIN, ~/INFO, ~/PLAN, ~/learned-lessons${RESET}  (your personal content)"
echo -e "  • Himalaya: ${BLUE}~/.local/bin${RESET} + the PATH line in ${BLUE}~/.bash_aliases${RESET} / ${BLUE}~/.profile${RESET}"
echo ""
if [ "$FORCE" -eq 0 ]; then
    echo -e "Re-run with ${BOLD}--force${RESET} to delete (you'll be asked before each file)."
fi
