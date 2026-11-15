# Router — where each lesson lives

> The map, not the content. A lesson lives in its domain file; `INDEX.md` is only
> a table of contents, and this router is what you read *before* you start.

## Searching — always before you start

`grep -ril "<keyword>" ~/BRAIN/learned-lessons --include=*.md` finds a lesson by
title and content. Or read the domain file below: a handful of lessons, not the
whole archive. Found a lesson only after the work was done? One line in
`MISSES.md`.

## technical

- `capsule-scaffolding.md` — capsule sync, symlinks, scaffolding drift
- `extension-browser-testing.md` — Chrome for Testing, `--load-extension`, DevTools
- `memory-hygiene.md` — Memanto decay, prune, silent bloat
- `agent-methodology.md` — layered QA, completeness in tooling, agent output
- `web-scraping.md` — Sheets CSV export, scraping through export URLs
- `email-integration.md` — himalaya: duplicates, IMAP timeouts, sender headers
- `ai-network-resilience.md` — transient network failures and retries
- `infrastructure-tooling.md` — token budget, tokenizers, context cost

## security

- `privacy-and-access.md` — PII-safe publishing, public repositories

## New lesson

Add it to the domain file it belongs to — never to `INDEX.md`. Then set
`domain:` in the frontmatter.