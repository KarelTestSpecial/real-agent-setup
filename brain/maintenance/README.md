# 🧰 Maintenance Playbooks

Operational playbooks for keeping the MACCHA capsule healthy. Each playbook is a
short, repeatable procedure — not a policy. The policies themselves live in
`~/BRAIN/AGENTS.md` (the mandate file) and are enforced by machine checks.

## Index

| Playbook | Covers |
|---|---|
| [`mandate-budget-maintenance.md`](mandate-budget-maintenance.md) | Measure and trim the mandate file against the Context Efficiency budget. |
| [`tms-maintenance.md`](tms-maintenance.md) | TMS hygiene: flow, sweep, pruning, guardrails and archive retention. |

## Where the automation lives

| Mechanism | Trigger | Role |
|---|---|---|
| `~/bin/maccha/session-startup` | session start | primes context, checks the TMS, runs throttled weekly jobs (sweep, backup, link check). |
| `~/bin/maccha/session-closeout` | closeout | prunes the TMS, prompts the method-improver reflection, runs the integrity hook. |
| `~/bin/maccha/tms_integrity_hook.py` | closeout (and any manual run) | the machine guard: git/workspace activity, lesson integrity, index coverage, guardrails, archive retention, context budget, publish drift. |
| `~/INFRA/maintenance/tms_prune.js` | startup + closeout | rotates the oldest `done.md` lines into the quarterly archive. |

> [!NOTE]
> These playbooks describe the **single source** of each rule. When a rule and a
> playbook disagree, the mandate file wins — and the playbook is the thing to fix.

## Related

- `brain/lib/README.md` — the Memanto memory engine and its decay rates.
- `~/BRAIN/policies/guardrails.md` — the machine-enforced guardrail register.
- `~/BRAIN/archive/README.md` — the archive retention policy.
