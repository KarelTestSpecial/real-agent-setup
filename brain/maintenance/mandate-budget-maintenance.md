# 📏 Mandate Budget Maintenance

Keep the mandate file small enough that an agent can load it every session
without wasting context. The budget is the **Context Efficiency** rule.

## The rule

> Mandate files stay **≤ N tokens** of critical mandates; project-specific detail
> lives in the Deep Knowledge Index.

## Single source of the norm

The number lives in exactly one place: the **Context Efficiency** line of
`~/BRAIN/AGENTS.md`. The integrity hook reads it from there with a regex and
falls back to **3333** only when the line is unreadable — it never hardcodes a
second copy.

## What gets measured

| File | Enforced | Notes |
|---|---|---|
| `~/BRAIN/AGENTS.md` | yes | The runtime mandate file — the single source of the norm. |
| `real-agent-setup/system-brain/AGENTS.md` | yes | The English capsule copy, measured against the same norm. |
| `~/.gemini/GEMINI.md` | no | Reported **informationally only**; an owner decision keeps it untouched. |

## How to measure (never guess)

Use the real tokenizer — the heuristic "characters ÷ 4" is wrong and drifts.

```bash
~/bin/maccha/count-tokens ~/BRAIN/AGENTS.md
```

`count-tokens` uses `js-tiktoken` with the `cl100k_base` encoding, so the number
is comparable to what the model actually pays. Always measure the **whole file**;
slicing a section and adding the pieces gives inconsistent results.

## How the machine reports it

`check_context_budget()` in `~/bin/maccha/tms_integrity_hook.py` measures the
enforced files and prints one line each:

```
✅ ~/BRAIN/AGENTS.md: 3196/3333 tokens (137 free).
⚠️ real-agent-setup/system-brain/AGENTS.md: 3400/3333 tokens — over budget.
```

It is **non-blocking by design**: trimming a mandate file is a human decision, so
an over-budget file warns but never fails the hook.

## Trim procedure

1. **Measure** the whole file with `count-tokens`.
2. **Rank** the mandates by how often they actually fire. The least-load-bearing
   one is the first candidate.
3. **Compact** wording: one line per rule, a table instead of prose, drop
   examples that the reader can reconstruct.
4. **Displace** detail instead of deleting it — move it to the Deep Knowledge
   Index (`learned-lessons/`) and leave a one-line link behind.
5. **Sync** the runtime file and the capsule copy; both are measured.
6. **Re-measure** and confirm the free margin is positive.

## Pitfalls

- **Do not** add a second copy of the norm. The hook parses the line, so a
  hardcoded number elsewhere silently disagrees.
- **Do not** measure with a character heuristic or a section slice.
- **Do not** delete a rule that still fires — displace it to a lesson and link.
