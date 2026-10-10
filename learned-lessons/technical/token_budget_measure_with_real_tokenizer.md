---
category: technical
domain: infrastructure-tooling
tier: 2
last_updated: 2026-10-10
---

# Measure your token budget with a real tokenizer — never estimate

A MANDATORY rule like *"these mandate files stay ≤ 2500 tokens"* cannot be
checked with heuristics: the usual shortcuts are systematically **too low**,
and their uncertainty band usually overlaps the very limit you are checking:

| Method | estimate (Dutch file) | actual (cl100k) | error |
|---|---|---|---|
| `len(chars)/4` | 2 676 | **3 457** | −23% |
| `words × 1.33` | ~1 690 | **3 457** | −51% |
| band of both (bootstrap file) | 1 862–2 647 | **2 764** | limit 2500 sits *inside* the band |

**Why:** Dutch tokenizes worse than English, and markdown (pipes, backticks,
emoji, frontmatter) adds characters no heuristic accounts for. **Rule: if your
uncertainty band overlaps the limit, counting beats estimating — measure.**

## Actual count, no new infrastructure

```bash
# pnpm, policy-compatible: explicitly pinned version older than
# minimum-release-age=10080, ignore-scripts blocks install hooks
pnpm add js-tiktoken@1.0.21 --save-exact
node -e "
const { getEncoding } = require('js-tiktoken');
const fs = require('fs');
const enc = getEncoding('cl100k_base');
for (const p of process.argv.slice(1))
  console.log(enc.encode(fs.readFileSync(p,'utf8')).length, '<-', p);
" BRAIN/AGENTS.md ~/.gemini/GEMINI.md
```

`js-tiktoken` ships the BPE ranks inside the package (no runtime download),
is pure JS, and 1.0.21 is far older than the 7-day cooldown → no bypass
needed. This harness wraps it as `~/bin/maccha/count-tokens <file> [...]`.

## What it caught

The count showed **3 of 3 mandate files over budget** (2 764 / 3 457 / 4 325)
while every estimate said "roughly fine" — turning a false all-green verdict
into an immediate follow-up task (restate the budget + a machine guardrail).
Same family as [verify public claims against the source](publicatieclaims_verificeren_tegen_clean_clone.md):
**re-check every measurement you make with the tool that defines the limit
itself, not with your eye.**
