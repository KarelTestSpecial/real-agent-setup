# 🛡️ Guardrails Register (MACCHA) — Template

This file is the register of **machine-enforced guardrails**: rules that are
automatically checked by `~/bin/tms_integrity_hook.py` at every
session-closeout / SessionEnd (works for all agents: Claude Code,
Gemini/Antigravity, OpenCode).

## How this works (for humans and agents)
- Every guardrail is one `## Guardrail:` block with `- key: value` lines.
- **Data stays with its owner** (one fact, one owner): a guardrail *points to*
  a source file, it never copies data.
- Disable a guardrail = set `- actief: nee`, or delete the whole block.
  The hook code never needs to change for this.
- If this file is missing or contains no active blocks, the check is silently skipped.

## Supported rule types
| type | meaning |
| :--- | :--- |
| `verboden-termen-in-actieve-tms` | Bold items (`- **Name**: …`) from the given section of the source file must not appear in `todo.md` / `in-progress.md`. The part before an optional `(` is used as the search term. |

---

## Guardrail: example-blocklist
- actief: nee
- type: verboden-termen-in-actieve-tms
- bron: ~/INFO/your-blocklist-owner-file.md
- sectie: ## ⚠️ Blacklist
- toelichting: Example — point this at the file that owns your blocklist (honeypots, scam targets, forbidden projects). Set `actief: ja` to enable.
