#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# MACCHA — Multi-Agent Continuous Context Harness Setup Script
# ============================================================
# This script sets up a new machine with the complete MACCHA
# scaffolding system. It copies all tools and templates so the
# environment can run independently after setup.
# ============================================================

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="${HOME:-/home/$(whoami)}"

# Premium ANSI Terminal Colors
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
MAGENTA="\033[35m"
BOLD="\033[1m"
RESET="\033[0m"

echo -e "${CYAN}${BOLD}======================================================${RESET}"
echo -e "${CYAN}${BOLD}  🧠 MACCHA — Multi-Agent Continuous Context Harness  ${RESET}"
echo -e "${CYAN}${BOLD}======================================================${RESET}"
echo -e "  ${BLUE}Target Path  : ${YELLOW}$HOME_DIR${RESET}"
echo -e "  ${BLUE}Source Repo  : ${YELLOW}$REPO_DIR${RESET}"
echo -e "${CYAN}${BOLD}======================================================${RESET}"
echo ""

copy_if_missing() {
    local src="$1" dst="$2"
    if [ -e "$dst" ] || [ -L "$dst" ]; then
        echo "  ~ $dst bestaat al, overslaan"
    else
        mkdir -p "$(dirname "$dst")"
        cp -r "$src" "$dst"
        echo "  ✓ gekopieerd $src -> $dst"
    fi
}

copy_always() {
    local src="$1" dst="$2"
    mkdir -p "$(dirname "$dst")"
    cp -r "$src" "$dst"
    echo "  ✓ gekopieerd $src -> $dst"
}

# === Brain (Memory Engine) ===
echo ""
echo -e "${CYAN}${BOLD}🧠 [1/6] Brain Memory Engine${RESET}"
copy_always "$REPO_DIR/brain/lib" "$HOME_DIR/INFRA/agents-brain/lib"
mkdir -p "$HOME_DIR/INFRA/agents-brain/data"

# === CLI Tools ===
echo ""
echo -e "${CYAN}${BOLD}🛠️  [2/6] CLI Utilities${RESET}"
mkdir -p "$HOME_DIR/bin/maccha"
for script in "$REPO_DIR"/cli-tools/*; do
    name=$(basename "$script")
    if [ ! -f "$HOME_DIR/bin/maccha/$name" ]; then
        cp "$script" "$HOME_DIR/bin/maccha/$name"
        chmod +x "$HOME_DIR/bin/maccha/$name"
        echo -e "  ${GREEN}✓${RESET} $name -> bin/maccha/"
    else
        echo -e "  ${YELLOW}~${RESET} bin/maccha/$name exists, skipping"
    fi
done

# === Infrastructure ===
echo ""
echo -e "${CYAN}${BOLD}📂 [3/6] Infrastructure Bridges${RESET}"
mkdir -p "$HOME_DIR/INFRA"
for f in mydrive-access-tool.js storage-manager.js manual-scrcpy.txt; do
    if [ ! -f "$HOME_DIR/INFRA/$f" ]; then
        cp "$REPO_DIR/infrastructure/$f" "$HOME_DIR/INFRA/$f"
        echo -e "  ${GREEN}✓${RESET} $f -> INFRA/"
    else
        echo -e "  ${YELLOW}~${RESET} INFRA/$f exists, skipping"
    fi
done

# Kopieer maintenance scripts
if [ -d "$REPO_DIR/infrastructure/maintenance" ]; then
    mkdir -p "$HOME_DIR/INFRA/maintenance"
    cp -r "$REPO_DIR/infrastructure/maintenance"/* "$HOME_DIR/INFRA/maintenance/"
    echo -e "  ${GREEN}✓${RESET} maintenance/ -> INFRA/maintenance/ (Installed successfully)"
fi

# === System Brain (templates — enkel als nog niet bestaan) ===
echo ""
echo -e "${CYAN}${BOLD}📝 [4/6] MACCHA System Templates (Home Directory)${RESET}"
for f in AGENTS.md IMPROVEMENT.md done.md in-progress.md todo.md; do
    if [ ! -f "$HOME_DIR/$f" ]; then
        cp "$REPO_DIR/system-brain/$f" "$HOME_DIR/$f"
        echo -e "  ${GREEN}✓${RESET} $f (Created default template)"
    else
        echo -e "  ${YELLOW}~${RESET} $HOME_DIR/$f exists, skipping template creation to protect your edits"
    fi
done

# Cross-agent hooks (shared by Claude Code, Gemini/Antigravity, OpenCode)
mkdir -p "$HOME_DIR/BRAIN/hooks"
for hook in "$REPO_DIR"/system-brain/hooks/*.cjs; do
    name=$(basename "$hook")
    if [ ! -f "$HOME_DIR/BRAIN/hooks/$name" ]; then
        cp "$hook" "$HOME_DIR/BRAIN/hooks/$name"
        echo -e "  ${GREEN}✓${RESET} BRAIN/hooks/$name (cross-agent hook)"
    else
        echo -e "  ${YELLOW}~${RESET} BRAIN/hooks/$name exists, skipping"
    fi
done

# Guardrails register (machine-enforced policies, read by tms_integrity_hook.py)
if [ ! -f "$HOME_DIR/BRAIN/policies/guardrails.md" ]; then
    mkdir -p "$HOME_DIR/BRAIN/policies"
    cp "$REPO_DIR/system-brain/policies/guardrails.md" "$HOME_DIR/BRAIN/policies/guardrails.md"
    echo -e "  ${GREEN}✓${RESET} BRAIN/policies/guardrails.md (Created default template)"
else
    echo -e "  ${YELLOW}~${RESET} BRAIN/policies/guardrails.md exists, skipping"
fi

# === Learned Lessons ===
echo ""
echo -e "${CYAN}${BOLD}📚 [5/6] Learned Lessons Registry${RESET}"
if [ ! -d "$HOME_DIR/learned-lessons" ]; then
    mkdir -p "$HOME_DIR/learned-lessons"
    # Kopieer README placeholder
    if [ -f "$REPO_DIR/learned-lessons/README.md" ]; then
        cp "$REPO_DIR/learned-lessons/README.md" "$HOME_DIR/learned-lessons/README.md"
        echo -e "  ${GREEN}✓${RESET} learned-lessons/ established"
    fi
else
    echo -e "  ${YELLOW}~${RESET} learned-lessons/ directory exists, skipping"
fi

# === Personal Zones (empty scaffolding — matches the AGENTS.md zone model) ===
echo ""
echo -e "${CYAN}${BOLD}📋 [6/6] Personal Zone Scaffolding${RESET}"
for zone in "INFO/over-owner" "INFO/voor-owner" PLAN INBOX workspace scratch; do
    if [ ! -d "$HOME_DIR/$zone" ]; then
        mkdir -p "$HOME_DIR/$zone"
        echo -e "  ${GREEN}✓${RESET} $zone/ created"
    else
        echo -e "  ${YELLOW}~${RESET} $zone/ exists, skipping"
    fi
done
echo -e "  ${BLUE}ℹ${RESET}  Add your situation file at ~/INFO/over-owner/SITUATIE_OVERZICHT.md (see ~/AGENTS.md, Tier 3)."

# === OPTIONAL: Himalaya CLI Email Client ===
echo ""
echo "--- Himalaya CLI E-mail Client (Optioneel) ---"
if [ -t 0 ]; then
    read -r -p "Wil je Himalaya CLI installeren voor terminal-e-mailintegratie? (y/n) [n]: " answer
    answer=${answer:-n}
else
    answer="n"
fi

if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    echo "  ~ Himalaya CLI downloaden en installeren..."
    mkdir -p "$HOME_DIR/.local/bin"
    if curl -sSL https://raw.githubusercontent.com/pimalaya/himalaya/master/install.sh | PREFIX="$HOME_DIR/.local" sh; then
        echo "  ✓ Himalaya binary geïnstalleerd in ~/.local/bin"
        
        # Voeg toe aan .bash_aliases
        local_alias_file="$HOME_DIR/.bash_aliases"
        if [ -f "$local_alias_file" ]; then
            if ! grep -q "Himalaya CLI PATH" "$local_alias_file"; then
                echo -e "\n# Himalaya CLI PATH\nexport PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$local_alias_file"
                echo "  ✓ PATH toegevoegd aan ~/.bash_aliases"
            fi
        else
            echo -e "\n# Himalaya CLI PATH\nexport PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$HOME_DIR/.profile"
            echo "  ✓ PATH toegevoegd aan ~/.profile"
        fi
    else
        echo "  ❌ Installatie van Himalaya is mislukt."
    fi
else
    echo "  ~ Himalaya CLI installatie overgeslagen."
fi



echo ""
echo -e "${GREEN}${BOLD}======================================================${RESET}"
echo -e "${GREEN}${BOLD}     ✅ MACCHA HARNESS INSTALLATION COMPLETED!         ${RESET}"
echo -e "${GREEN}${BOLD}======================================================${RESET}"
echo ""
echo -e "Your local system is now fully configured and independent from this repo."
echo -e "You can keep or delete the cloned repository folder."
echo ""
echo -e "${CYAN}${BOLD}Next Steps to Activate Your Personal Assistant:${RESET}"
echo -e "  ${YELLOW}1.${RESET} Customize your bootstrap templates inside your home folder:"
echo -e "     - ${BLUE}~/AGENTS.md${RESET}         (Master Bootstrap profile)"
echo -e "     - ${BLUE}~/IMPROVEMENT.md${RESET}    (Long-Term Auto-Improvement configuration)"
echo -e "     - ${BLUE}~/ALIASES.md${RESET}        (Productivity shell shortcuts)"
echo -e "  ${YELLOW}2.${RESET} Add the bin folder to your PATH profile (e.g. in ${BLUE}~/.bash_aliases${RESET}):"
echo -e "     ${BOLD}export PATH=\"\$HOME/bin/maccha:\$HOME/bin:\$PATH\"${RESET}"
echo -e "  ${YELLOW}3.${RESET} Start your AI assistant (Antigravity, OpenCode, Claude Code, etc.)"
echo -e "     It will read ${BLUE}~/AGENTS.md${RESET} first and be immediately operational!"
echo -e "  ${YELLOW}4.${RESET} To publish local improvements back to your repo:"
echo -e "     ${BOLD}bash publish.sh${RESET}"
echo -e "${GREEN}${BOLD}======================================================${RESET}"
echo ""
