---
category: security
domain: privacy-and-access
tier: 2
last_updated: 2026-06-15
---

# PII-safe publishing of a live capsule to a public repo

## 1. The problem
When syncing a live agent capsule into a public repo, the owner's name kept leaking in — not through the obvious username, but through **folder and file names**:
- folder names like `about-<name>` / `for-<name>` / `to-<name>` (first name embedded in paths);
- a filename like `upload-docs-<name>.js` (a name in the filename itself);
- hardcoded `/home/<user>/` paths in scripts.

Worse: the first "fix" put the to-be-skipped filenames and the scrub patterns **literally into the committed `publish.sh`** — so the sanitization script itself published the names. A blind `cp`-based publish reintroduces such leaks on every sync.

## 2. The solution — config-driven sanitization + hard gate
Keep all personal tokens out of tracked files by driving the publish pipeline through **git-ignored config files** (do not hardcode them in the script):
- `.publish-skip` — filenames/globs that are never published;
- `.publish-sanitize.sed` — `sed` rewrite rules (personal tokens → a generic `*-owner` standard);
- `.publish-pii-words` — wordlist for the **hard PII gate**.

Also: wrap personal, non-generic blocks inside a shared script with `# >>> LOCAL-ONLY … # <<< LOCAL-ONLY`; the publish strips everything between.

**Hard gate before commit** (aborts on a leak): scan the synced folders for (a) every word from the PII list and (b) hardcoded `/home/<user>/` paths. Two pitfalls seen live:
1. `grep --include="*.sh"` skips **extension-less** scripts (like `session-startup`) → use `grep -rnI` without `--include`, or `find` over all files.
2. `if find … | xargs grep` has **unreliable exit codes** (xargs returns 123 on a no-match) → false alarm. Use a single `grep -rnI` (reliable exit) or capture the output and test for emptiness.

Always test the gate functionally with an injected leak (a bare name and a `/home/someone/` path in an extension-less file) — not with a token the sanitizer would scrub anyway.

## 3. Actually cleaning existing history
- `git filter-repo --replace-text` scrubs tokens from all blobs but leaves **`refs/replace/*`** that keep the old commits locally reachable → `git replace -d` them, then `reflog expire --expire=now --all` + `gc --prune=now`.
- For a maximally clean result: **squash to a single root commit** (`git checkout --orphan`) of the already-verified working tree; the tree hash should stay identical (content preserved, only history gone).
- **Caveat:** a force-push makes old commits *unreachable*, but the host keeps loose objects (retrievable by exact hash) until its own GC runs — 100% immediate removal needs a support request to the host.
- The account name in the repo URL/LICENSE is unavoidable (the repo lives at that URL); that is not a scrubbable leak.

## 4. Core rule
PII hides in **paths and filenames**, not just usernames. Sanitize at the source via git-ignored config (never put the names in the public script), guard with a hard gate that scans every file type, and verify the gate with a real leak. See also [[capsule_sync_bidirectional_drift]].
