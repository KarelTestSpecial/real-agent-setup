#!/bin/bash
# Bounty Workspace Cleanup Tool (Supreme Strategy v1.0)
# Removes heavy dependencies while preserving essential project logs.

PROJECT_DIR=$1

if [ -z "$PROJECT_DIR" ]; then
    echo "Usage: ./bounty-clean.sh <project-directory>"
    exit 1
fi

if [ ! -d "$PROJECT_DIR" ]; then
    echo "Error: Directory $PROJECT_DIR not found."
    exit 1
fi

echo "🧹 Cleaning workspace: $PROJECT_DIR"

# 1. Remove Node.js bloat
if [ -d "$PROJECT_DIR/node_modules" ]; then
    echo "  - Removing node_modules..."
    rm -rf "$PROJECT_DIR/node_modules"
fi

# 2. Remove Python bloat
if [ -d "$PROJECT_DIR/.venv" ]; then
    echo "  - Removing .venv..."
    rm -rf "$PROJECT_DIR/.venv"
fi

# 3. Remove Hardhat/Build caches
if [ -d "$PROJECT_DIR/cache" ]; then
    echo "  - Removing build cache..."
    rm -rf "$PROJECT_DIR/cache"
fi
if [ -d "$PROJECT_DIR/artifacts" ]; then
    echo "  - Removing artifacts..."
    rm -rf "$PROJECT_DIR/artifacts"
fi

# 4. Remove .git (optional, keep if user wants to track changes, but saves space)
# Uncomment the line below if you want to remove the full git history for space
# rm -rf "$PROJECT_DIR/.git"

echo "✨ Cleanup complete for $PROJECT_DIR"
echo "💡 Essential files (README, contracts, tests) were PRESERVED."
