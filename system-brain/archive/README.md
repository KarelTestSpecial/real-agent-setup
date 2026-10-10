# BRAIN/archive — technical archive (append-only)

This directory is **append-only**: three flows push things *into* it, but no
mechanism ever deletes or decays anything here. Memanto's confidence-decay only
applies to `BRAIN/memanto/memanto_global.json` (the working memory). Removal
therefore happens **only manually**, on a signal, and with the owner's approval
(HITL).

## The three flows

| Flow | Mechanism | Purpose |
|---|---|---|
| TMS prune | `~/INFRA/maintenance/tms_prune.js`, run by `session-startup` + `session-closeout` | `done.md` over 100 lines → oldest lines move to `tms/<year>-Q<quarter>.md` |
| Memanto | `memanto_cli.py prune` (startup) | Clears decayed entries from **working memory**; the `memanto/*.bak*` files here are manual snapshots taken before a cleanup and live outside that decay |
| `maccha-backup` | weekly, encrypted tar → cloud drive | Ships `BRAIN/archive/` in full |

## Retention

| Type | Term | Rationale |
|---|---|---|
| Canonical documents (e.g. `improvement-lessons-log.md`) | **permanent** | Owner of the full lesson history |
| TMS quarterly files (`tms/`) | **permanent** | The only work history; text costs almost nothing |
| Everything else (bak files, pre-x snapshots, retired scripts, ad-hoc restore points) | **6 months** | A restore point is obsolete once the change it protected is stable |
| Hard total budget | **5 MB** | Guardrail against silent growth |

## What belongs here (and what does not)

`BRAIN/archive` is the **knowledge archive of the capsule** — fed by machine
flows or deliberately curated. It is not a junk drawer for backups:

| Belongs here | Does NOT belong here → |
|---|---|
| TMS quarterly files (machine, `tms_prune.js`) | **Restore points & system leftovers** → `~/INFRA/backups/` (6 months, never permanent) |
| Memanto snapshots taken before a cleanup | Temporary output → just delete it from `~/scratch/` |
| Canonical documents (e.g. `improvement-lessons-log.md`) | Active knowledge → `learned-lessons/`, `tms/`, `policies/` |
| Retired hooks/scripts kept as history | Live tooling → `~/bin/maccha/` (version-controlled) |

The retention check scans **both** directories (`BRAIN/archive` +
`~/INFRA/backups`); the `permanent` exemption applies only to this archive.

## Maintenance ritual

1. **Signal:** `tms_integrity_hook.py` (runs on every closeout) reads the
   machine-readable block below and warns about items past their term or about
   an archive over budget. It **never blocks** — it is a cleaning signal.
2. **Clean:** only with explicit owner approval. Weigh per item whether it may
   be merged into a quarterly file, kept by the cloud backup, or deleted.
3. **Register** the action in `tms/done.md`.

<!-- RETENTIE
permanent = improvement-lessons-log.md, tms
overig_dagen = 180
max_mb = 5
RETENTIE -->
