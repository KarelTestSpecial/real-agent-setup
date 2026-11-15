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
    # A missing source is "not installed here", never an error: returning 1
    # would abort the whole run under `set -e`.
    [ -e "$repo" ] || return 0
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

# Remove a symlink that points into the capsule ( ~/AGENTS.md, ~/todo.md, … ).
# It carries no data of its own, so — unlike consider() — there is nothing to
# compare or keep: an edited link is not a thing. Only the target file decides
# whether content survives.
remove_link() {
    local link="$1"
    if [ "$FORCE" -eq 1 ] || [ "$ASSUME_YES" -eq 1 ]; then
        rm -f "$link"
        echo -e "  ${GREEN}✗ removed${RESET} $link (symlink)"
        REMOVED+=("$link")
    else
        echo -e "  ${YELLOW}[dry-run] would remove${RESET} $link ${BLUE}(symlink)${RESET}"
        WOULD+=("$link")
    fi
}

# Walk every file under repo dir $1, comparing to installed dir $2.
consider_tree() {
    # Strip a trailing slash: with one, "${f#"$srcdir"/}" no longer matches and
    # the absolute source path gets appended to the destination (skills/*/).
    local srcdir="${1%/}" dstdir="${2%/}"
    [ -d "$srcdir" ] || return
    while IFS= read -r -d '' f; do
        consider "$f" "$dstdir/${f#"$srcdir"/}"
    done < <(find "$srcdir" -type f -print0)
}

print_list() {  # $1 = title color+label, rest = items
    local label="$1"; shift
    # Drop empty entries: "${arr[@]:-}" expands to one empty string when the
    # array is empty, which used to print a phantom "Kept (edited by you): (1)".
    local items=() i
    for i in "$@"; do
        if [ -n "$i" ]; then items+=("$i"); fi
    done
    [ "${#items[@]}" -gt 0 ] || return
    echo -e "$label ${BOLD}(${#items[@]})${RESET}"
    for i in "${items[@]}"; do echo -e "    $i"; done
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

echo -e "${CYAN}${BOLD}🛠️  CLI utilities (~/bin/maccha)${RESET}"
# setup.sh installs into ~/bin/maccha/, so that is where we look — comparing
# against ~/bin/<name> made every tool look absent and left all of them behind.
for script in "$REPO_DIR"/cli-tools/*; do
    consider "$script" "$HOME_DIR/bin/maccha/$(basename "$script")"
done

echo -e "${CYAN}${BOLD}📂 Infrastructure bridges (~/INFRA)${RESET}"
for f in mydrive-access-tool.js storage-manager.js manual-scrcpy.txt; do
    consider "$REPO_DIR/infrastructure/$f" "$HOME_DIR/INFRA/$f"
done
consider_tree "$REPO_DIR/infrastructure/maintenance" "$HOME_DIR/INFRA/maintenance"

echo -e "${CYAN}${BOLD}📝 Home templates & hooks${RESET}"
consider "$REPO_DIR/system-brain/IMPROVEMENT.md" "$HOME_DIR/IMPROVEMENT.md"

# TMS: the capsule owns BRAIN/tms/<file>; the home-root names are symlinks into
# it (same layout as ~/AGENTS.md). Remove the link first — it carries no data —
# then the target file. A real file at the home root is the pre-1.5.1 layout and
# is handled by consider(): kept unless it is still byte-for-byte the template.
for f in todo.md in-progress.md backlog.md done.md; do
    if [ -L "$HOME_DIR/$f" ]; then
        remove_link "$HOME_DIR/$f"
    elif [ -e "$HOME_DIR/$f" ]; then
        consider "$REPO_DIR/system-brain/$f" "$HOME_DIR/$f"
    fi
    consider "$REPO_DIR/system-brain/$f" "$HOME_DIR/BRAIN/tms/$f"
done

# Template layout: ~/AGENTS.md is a symlink to BRAIN/AGENTS.md. Remove the link
# itself (it carries no data), then the target file.
if [ -L "$HOME_DIR/AGENTS.md" ]; then
    remove_link "$HOME_DIR/AGENTS.md"
fi
consider "$REPO_DIR/system-brain/AGENTS.md" "$HOME_DIR/BRAIN/AGENTS.md"
consider "$REPO_DIR/system-brain/MANDATE_GUIDE.md" "$HOME_DIR/BRAIN/MANDATE_GUIDE.md"
if [ -e "$HOME_DIR/AGENTS.md" ] && [ ! -L "$HOME_DIR/AGENTS.md" ]; then
    consider "$REPO_DIR/system-brain/AGENTS.md" "$HOME_DIR/AGENTS.md"
fi
for hook in "$REPO_DIR"/system-brain/hooks/*.cjs; do
    consider "$hook" "$HOME_DIR/BRAIN/hooks/$(basename "$hook")"
done
consider "$REPO_DIR/system-brain/policies/guardrails.md" "$HOME_DIR/BRAIN/policies/guardrails.md"

echo -e "${CYAN}${BOLD}📚 Seeded placeholders${RESET}"
consider "$REPO_DIR/learned-lessons/README.md" "$HOME_DIR/BRAIN/learned-lessons/README.md"
consider "$REPO_DIR/system-brain/archive/README.md" "$HOME_DIR/BRAIN/archive/README.md"

echo -e "${CYAN}${BOLD}🧩 Agent skills${RESET}"
# setup.sh copies each skills/<name>/ into ~/.agents/skills and, when it exists,
# ~/.claude/skills. Uninstall walks the same trees and keeps anything edited.
for target in "$HOME_DIR/.agents/skills" "$HOME_DIR/.claude/skills"; do
    for skill in "$REPO_DIR"/skills/*/; do
        [ -d "$skill" ] || continue
        consider_tree "$skill" "$target/$(basename "$skill")"
    done
done

# Tidy up now-empty scaffolding dirs (never personal-data dirs), with confirmation.
if [ "$FORCE" -eq 1 ]; then
    EMPTIES=(
        "$HOME_DIR/INFRA/agents-brain/lib"
        "$HOME_DIR/INFRA/maintenance"
        "$HOME_DIR/BRAIN/hooks"
        "$HOME_DIR/BRAIN/policies"
        "$HOME_DIR/BRAIN/tms"
        "$HOME_DIR/bin/maccha"
        "$HOME_DIR/bin"
    )
    for target in "$HOME_DIR/.agents/skills" "$HOME_DIR/.claude/skills"; do
        for skill in "$REPO_DIR"/skills/*/; do
            [ -d "$skill" ] || continue
            EMPTIES+=("$target/$(basename "$skill")")
        done
        EMPTIES+=("$target")
    done
    for d in "${EMPTIES[@]}"; do
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
echo -e "  • ${BLUE}~/BRAIN (incl. learned-lessons), ~/INFO, ~/PLAN${RESET}  (your personal content)"
echo -e "  • ${BLUE}~/.config/maccha/${RESET}  (tms_line_limit.json, secrets, keys — installer config, not a repo copy)"
echo -e "  • Himalaya: ${BLUE}~/.local/bin${RESET} + the PATH line in ${BLUE}~/.bash_aliases${RESET} / ${BLUE}~/.profile${RESET}"
echo ""
if [ "$FORCE" -eq 0 ]; then
    echo -e "Re-run with ${BOLD}--force${RESET} to delete (you'll be asked before each file)."
fi
