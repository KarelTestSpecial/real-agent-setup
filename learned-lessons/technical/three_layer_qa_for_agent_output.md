---
title: Three-layer QA for agent output
category: technical
domain: agent-methodology
tier: 2
last_updated: 2026-06-12
---

# Three-layer QA for agent output (cheap builds, strong reviews, human decides)

## The lesson
Cheap models deliver usable work *if* there is layered review on top. A working pattern:

1. **Layer 1 — a cheap model builds** and self-verifies through tests it writes itself (the tests are the "eyes" of an autonomous agent; without tests it cannot know whether its code works).
2. **Layer 2 — a strong (SOTA) model reviews independently**: re-run the tests itself (never take the builder agent's word — its log only contains its own summary), check facts, judge the diff line by line.
3. **Layer 3 — a human (HITL) decides on everything that goes outward** (PRs, comments, email) — and on the social layer both models miss.

## Practical rules of thumb
- Give cheap models tasks that are **factually checkable** (testable code, verifiable data); keep open-ended decisions with strong models.
- Require for every build task: ship tests and have them pass; the reviewer re-runs them in a clean environment (e.g. `uv run --with pytest --no-project`).
- Measure cost per task before/after via the provider's usage endpoint, so routing decisions are based on real numbers rather than guesses.
