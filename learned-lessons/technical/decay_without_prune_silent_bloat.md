---
title: Decay without prune = silent bloat
category: technical
domain: memory-hygiene
tier: 2
last_updated: 2026-06-26
---

# Decay without prune = silent bloat

An append-only memory or log store with confidence-decay does **not** clean itself up: decay only lowers the score, the entries stay and dilute semantic recall. A working-memory store that writes a marker on every session-close filled up until ~70% of it was decayed "session closed" events (one real case: 162 → 51 entries after a prune).

**Rule:** pair every decay/accumulation mechanism with an explicit flow-through/prune step (the same doorstroom principle used for a task system, generalized to working memory), and rotate that prune's own backups (keep only the newest N) so the cleanup doesn't pile up in turn.

Concretely, `memanto_cli.py prune` removes decayed `Event` entries below a confidence threshold, never touches curated categories (`Learning`/`Preference`/`Fact`), writes a dated backup, and keeps only the last 3 backups. It runs automatically inside the weekly startup sweep, so the store stays healthy without manual intervention.
