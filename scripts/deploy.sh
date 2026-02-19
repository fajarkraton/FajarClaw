#!/usr/bin/env bash
# FajarClaw — Deploy Skills to OpenClaw Workspace
# @ref FC-PRD-01 §4 (OpenClaw Extension Layer)
#
# Creates symlinks from project source to OpenClaw workspace paths.
# Usage: ./scripts/deploy.sh [--dry-run]

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Config
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_SRC="${PROJECT_DIR}/src/skills"
OPENCLAW_WORKSPACE="${HOME}/.openclaw/workspace/skills"
DRY_RUN=${1:-""}

SKILLS=(
    "fajarclaw-router"
    "fajarclaw-claude-code"
    "fajarclaw-antigravity"
    "fajarclaw-rag"
)

echo -e "${CYAN}🔧 FajarClaw Deploy — Symlink Skills to OpenClaw${NC}"
echo -e "   Source: ${SKILLS_SRC}"
echo -e "   Target: ${OPENCLAW_WORKSPACE}"
echo ""

if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo -e "${YELLOW}⚠️  DRY RUN — no changes will be made${NC}"
    echo ""
fi

# Create OpenClaw workspace if needed
if [[ ! -d "$OPENCLAW_WORKSPACE" ]]; then
    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        echo -e "  Would create: ${OPENCLAW_WORKSPACE}"
    else
        mkdir -p "$OPENCLAW_WORKSPACE"
        echo -e "  ${GREEN}✅ Created:${NC} ${OPENCLAW_WORKSPACE}"
    fi
fi

# Deploy AGENTS.md and CLAUDE.md to workspace root
WORKSPACE_ROOT="${HOME}/.openclaw/workspace"
for doc in AGENTS.md CLAUDE.md; do
    src="${PROJECT_DIR}/${doc}"
    dst="${WORKSPACE_ROOT}/${doc}"
    if [[ -f "$src" ]]; then
        if [[ "$DRY_RUN" == "--dry-run" ]]; then
            echo -e "  Would link: ${doc} → ${dst}"
        else
            ln -sf "$src" "$dst" 2>/dev/null || cp "$src" "$dst"
            echo -e "  ${GREEN}✅ ${doc}${NC} → ${dst}"
        fi
    fi
done

echo ""

# Symlink each skill
DEPLOYED=0
SKIPPED=0
FAILED=0

# Helper to safely increment
inc() { eval "$1=$(( ${!1} + 1 ))"; }

for skill in "${SKILLS[@]}"; do
    src="${SKILLS_SRC}/${skill}"
    dst="${OPENCLAW_WORKSPACE}/${skill}"

    if [[ ! -d "$src" ]]; then
        echo -e "  ${RED}❌ Missing:${NC} ${skill} (not found in src/skills/)"
        inc FAILED
        continue
    fi

    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        echo -e "  Would link: ${skill} → ${dst}"
        inc DEPLOYED
        continue
    fi

    # Remove existing (old deploy or broken link)
    if [[ -L "$dst" ]] || [[ -d "$dst" ]]; then
        rm -rf "$dst"
    fi

    if ln -s "$src" "$dst" 2>/dev/null; then
        echo -e "  ${GREEN}✅ ${skill}${NC} → symlinked"
        inc DEPLOYED
    else
        # Fallback: copy if symlink fails
        cp -r "$src" "$dst"
        echo -e "  ${YELLOW}📋 ${skill}${NC} → copied (symlink failed)"
        inc DEPLOYED
    fi
done

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Deployed: ${GREEN}${DEPLOYED}${NC} | Skipped: ${YELLOW}${SKIPPED}${NC} | Failed: ${RED}${FAILED}${NC}"

# Verify
if [[ "$DRY_RUN" != "--dry-run" ]] && [[ $DEPLOYED -gt 0 ]]; then
    echo ""
    echo -e "${CYAN}📁 Verification:${NC}"
    ls -la "${OPENCLAW_WORKSPACE}/" 2>/dev/null | grep fajarclaw || true
fi

echo ""
echo -e "${GREEN}✅ Deploy complete!${NC}"
