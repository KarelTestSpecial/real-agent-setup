# 🛡️ Guardrails Register (MACCHA) — Template

This file is the register of **machine-enforced guardrails**: rules that are
automatically checked by `~/bin/maccha/tms_integrity_hook.py` at every
session-closeout / SessionEnd (works for all agents: Claude Code,
Gemini/Antigravity, OpenCode).

## How this works (for humans and agents)
- Every guardrail is one `## Guardrail:` block with `- key: value` lines.
- **Data stays with its owner** (one fact, one owner): a guardrail *points to*
  a source file, it never copies data.
- Disable a guardrail = set `- active: no`, or delete the whole block.
  The hook code never needs to change for this.
- If this file is missing or contains no active blocks, the check is silently skipped.

## Supported rule types
| type | meaning |
| :--- | :--- |
| `forbidden-terms-in-active-tms` | Bold items (`- **Name**: …`) from the given section of the source file must not appear in `todo.md` / `in-progress.md`. The part before an optional `(` is used as the search term. |

---

## Guardrail: example-blocklist
- active: no
- type: forbidden-terms-in-active-tms
- source: ~/INFO/your-blocklist-owner-file.md
- section: ## ⚠️ Blacklist
- note: Example — point this at the file that owns your blocklist (honeypots, scam targets, forbidden projects). Set `active: yes` to enable.
