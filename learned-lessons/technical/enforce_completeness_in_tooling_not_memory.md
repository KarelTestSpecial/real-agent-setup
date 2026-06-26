---
title: Enforce completeness in tooling, not in memory
category: technical
domain: agent-methodology
tier: 2
last_updated: 2026-06-12
---

# Enforce completeness in tooling, not in memory

For recurring overview/aggregation tasks for a user: enforce completeness in the **script** (a source-glob manifest + converting recurring patterns like "every Saturday" or "monthly around the Nth" into concrete dates) and render the FULL output. Letting the model curate the result on its own reliably drops whole sources or items — in one session this happened three separate times.

**Pattern:** a sweep script (e.g. `agenda_sweep.py`) that walks an explicit source manifest and prints a "sources swept" footer as proof of completeness. The model assembles and phrases; it does not decide which sources to include. Completeness that matters should be a property of the tool, not of the model's attention.
