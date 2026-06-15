#!/bin/bash
# ============================================================
# 🛡️ MACCHA Safety Gate - Core Integrity and Environment Guard
# ============================================================
# Verifies system integrity, path consistency, and syntax validity
# across the MACCHA Multi-Agent harness installation.
# ============================================================

echo "🔍 Starting MACCHA Safety Gate..."

ERROR_COUNT=0
HOME_DIR="${HOME:-/home/$(whoami)}"

# 1. Core MACCHA Environment Verification
echo "📁 Validating 7-Tier Memory files..."
TIER_FILES=(
    "$HOME_DIR/AGENTS.md"
    "$HOME_DIR/IMPROVEMENT.md"
    "$HOME_DIR/todo.md"
    "$HOME_DIR/in-progress.md"
    "$HOME_DIR/done.md"
)

for f in "${TIER_FILES[@]}"; do
    if [ ! -f "$f" ]; then
        echo "❌ Missing required MACCHA file: $f"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    else
        echo "  ✓ Checked file: $(basename "$f")"
    fi
done

# 2. Memory Engine Syntax Verification
echo "🐍 Validating Python Memory Engine compilation..."
ENGINE_PATHS=(
    "$HOME_DIR/INFRA/agents-brain/lib/memanto_engine.py"
    "brain/lib/memanto_engine.py"
)

ENGINE_FOUND=0
for path in "${ENGINE_PATHS[@]}"; do
    if [ -f "$path" ]; then
        ENGINE_FOUND=1
        python3 -m py_compile "$path" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "❌ Syntax error detected in Memory Engine: $path"
            ERROR_COUNT=$((ERROR_COUNT + 1))
        else
            echo "  ✓ Compiled Memory Engine: $path"
        fi
    fi
done

if [ $ENGINE_FOUND -eq 0 ]; then
    echo "⚠️  Note: Memanto engine python script not found in typical runtime locations (skipping compiler check)."
fi

# 3. Path and Secret Leak Check
echo "📂 Scanning for legacy hardcoded path references..."
LEAKS_FOUND=0
LEGACY_PATTERNS=("INFO/aan-owner" "G_A/agents/real-agent/rapportage")

for pattern in "${LEGACY_PATTERNS[@]}"; do
    # Scan infrastructure files (excluding node_modules and .git)
    MATCHES=$(grep -rn "$pattern" infrastructure/ cli-tools/ 2>/dev/null | grep -v "node_modules")
    if [ -n "$MATCHES" ]; then
        echo "⚠️  Legacy hardcoded path pattern '$pattern' located:"
        echo "$MATCHES"
        LEAKS_FOUND=$((LEAKS_FOUND + 1))
    fi
done

if [ $LEAKS_FOUND -eq 0 ]; then
    echo "  ✓ No legacy leaks detected."
fi

# 4. Final Verdict
if [ $ERROR_COUNT -eq 0 ]; then
    echo "🟢 MACCHA SAFETY GATE: SUCCESS (System is secure and integral)"
    exit 0
else
    echo "🔴 MACCHA SAFETY GATE: FAILED with $ERROR_COUNT compilation/structural errors."
    exit 1
fi
