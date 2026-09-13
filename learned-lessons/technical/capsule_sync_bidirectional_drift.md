---
title: Capsule sync — always diff in both directions
category: technical
domain: capsule-scaffolding
tier: 2
last_updated: 2026-09-13
---

# Capsule sync — always diff in both directions

## Context
A live agent harness is published as a PII-free package into a public repo. The sync script (`publish.sh`) copies local files (`~/bin`, `~/INFRA`) into the repo on the assumption that local is always the newest version.

## Discovery
During a capsule audit the drift for one script turned out to be **reversed**: the repo held the newer, rewritten version, while the local copy still had a dead legacy script pointing at non-existent paths. A blind `publish.sh` run would have silently overwritten the good public version with the broken script — a regression straight into the public repo.

## Lesson
1. **Never sync blindly in one direction.** Before each capsule sync, compare per file with `cmp`/`diff` and, on drift, inspect the *content* to decide which side is newer/correct — mtime or "local wins" is not proof.
2. **Dead scripts give themselves away through their paths**: a script referencing non-existent directories is legacy, no matter where it lives. A quick existence check on referenced paths unmasks it.
3. **Sanitization belongs in the source, not the repo copy**: make the local script generic (`$HOME`, no names) instead of only cleaning the repo copy — otherwise the next sync undoes the sanitization.
4. **Secrets don't belong in the capsule zone**: everything under the sync/copyable zone must be PII- and secret-free; OAuth files and keys live in `~/.config/`, outside any sync route.
5. **`cp -ru` is a silent drift source**: "overwrite only if newer" compares **mtime**, not content. Because the sanitized repo copy often carries a *newer* mtime than the local source, `cp -ru` silently skips the local improvement → the repo stays stale. Use **`cp -rfL`** (always refresh, dereference symlinks so a local symlink never lands as an absolute personal path), and let a copy error abort the publish instead of swallowing it with `|| true`.

## Impact
Prevented a functional regression into the public repo; reusable for every future capsule sync or scaffolding publication. See also [[pii_safe_public_capsule_publishing]].
