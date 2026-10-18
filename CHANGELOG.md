# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
- **`mail-check` (cli-tools/)**: one read-only call that answers "check my mail" across *every* configured account, reading each account's All-Mail folder instead of the INBOX default (which covers a single account and misses whatever Gmail filed into labels). It carries no configuration: accounts come from `himalaya account list`, and the All-Mail folder is found by its IMAP `\All` attribute via `folder list -o json` — so the Dutch/English mailbox split (`[Gmail]/Alle e-mail` vs `[Gmail]/All Mail`) never has to be guessed, and a new account needs no edit. Output lists date, unread marker, sender, subject and the folder-local message id, plus the exact `message read` command per account; `--days`, `--unread`, `--account` and `--json` narrow it.
- **Working-memory rule in the `system-brain/AGENTS.md` template**: the template now states what the Memanto layer is *for* — session `Event`s, behavioural entries (`Instruction`/`Preference`/`Decision`/`Goal`), and references — and what it must never hold: a second copy of anything that already has an owner file (amounts, links, appointments, statuses). It ships the decision test (*"if this changes, which file must change with it?"*) and how to read the owner's *"put this in your memory"* — that phrase names an outcome ("make sure it stays findable"), not a store, so the normal answer is an owner file plus a reference. The rule's owner is the maintainer's private `BRAIN/AGENTS.md`; the template carries the mirror because `brain/lib/memanto_engine.py` ships here.
- **One codeword instead of a phrasing glossary (`system-brain/AGENTS.md`)**: the template now tells the implementer to agree **one** codeword for *"make sure this stays findable"* (English default `/persist`) rather than listing spellings — the codeword points at the test that is already in the mandate, so the mandate stays short. It also ships the design rule behind the choice: **name the outcome, not the store** — a codeword meaning *"save it"* or *"remember it"* pulls an agent toward the memory layer, which the working-memory rule forbids, whereas one meaning *"this must persist"* forces it to ask *where* the fact belongs. The step-by-step procedure lives in a slash command, not in this file.
- **Bundled agent skills (`skills/`)**: a new home for drop-in skills — plain `SKILL.md` files with YAML frontmatter that any harness reading a skills directory will pick up. First entry is `step-by-step`: patient one-step-at-a-time guidance with an explicit "the user holds the reins" rule, the opposite of the always-on agent that acts first and reports later. The directory is **hand-maintained in this repository, deliberately static** (like the `system-brain/` templates): the maintainer's personal Dutch-language variants live in a local `~/BRAIN/skills/` and are a *different artefact* — a published skill is a translation that may lag on purpose, so there is no `publish.sh` wiring and no allowlist line (see `skills/README.md`). `skills` is in `SYNC_DIRS` so the language and PII gates still cover it; `setup.sh` installs the bundled skills into `~/.agents/skills/` (plus `~/.claude/skills/` when that harness directory already exists), never overwriting an existing skill; and the public `system-brain/AGENTS.md` template documents the activation phrases so a fresh install knows the skill exists.
- **Release-drift reminder at closeout**: the integrity hook now warns (never blocks) when the capsule tag falls behind — 10+ commits since the newest tag, 30+ days since the tagged commit, or a `VERSION` bump without a matching tag. `publish.sh` deliberately does not couple a publish run to a release, so this check is the only signal that the tag is lagging (it once sat 27 commits and five weeks behind `v1.1.6`). Local only: it never contacts the remote.

### Fixed
- **`brain/lib/memanto_engine.py`: silent degradation when the API key is unreachable, plus a retired model id.** Two faults, one symptom. (1) The engine reads `GEMINI_API_KEY` from `~/.gemini/.env` → `~/.env` → `./.env`; when none of those exists it falls back to Vertex AI with the literal placeholder project id `your-vertex-project-id`, which fails with 403 (the Vertex route was closed anyway: billing is disabled on the project, and only the `generativelanguage` API is enabled there). (2) Even with a key, the hardcoded `gemini-2.5-flash` is *"no longer available to new users"* (404). The damage stayed invisible because embeddings are computed **lazily on `recall`**, never on `remember`: writes kept succeeding while search quietly degraded to keyword overlap — a path that still returns plausible results, so 24 of 203 entries (all session events of 14–17 October) silently had no vector. The generative model is now overridable via `MEMANTO_MODEL` (default `gemini-3.5-flash`), and the engine warns explicitly on both silent paths: using the placeholder project id, and writing an entry with no client (hence no vector). Entries already stored were re-embedded with `warmup_cache()`.
- `warmup_cache()`'s docstring claimed it returns "the count of newly embedded items" while it returns the **net** vector-cache delta (`len(self.cache) - before_count`), so pruning stale hashes can make the number negative — as it did when 10 entries were rewritten and 5 forgotten. The return value is unchanged (callers rely on the net delta); only the contract is now stated accurately.

### Changed
- `setup.sh`: the last Dutch strings are English (both copy confirmations, two comments and the skipped-Himalaya message). The language gate never saw them, because top-level files are outside `SYNC_DIRS` — so the one file a brand-new user runs first was also the one file never checked. The gate scope is deliberately unchanged; `setup.sh`/`publish.sh`/`README.md` stay out of it, since publishing never rewrites them.

## [1.2.0] - 2026-10-17
### Added
- `.publish-allowlist`: tracked, fail-closed publish curation. Every destination path that may ship is listed explicitly; anything else in `~/bin/maccha` or `~/INFRA` is skipped *and reported by name*. Publishing a tool now requires adding and committing a line instead of happening as a side effect of a blind copy. A missing allowlist aborts the copy phase (exit 1) rather than reverting to "copy everything".
- `requirements.txt` (`google-genai==2.11.0`): `brain/lib/memanto_engine.py` imports the SDK at module level and `setup.sh` installs no Python dependencies, so a clean clone crashed on first Memanto use. The prerequisite is now stated in the README.
- **Archive retention policy and check**: `tms_integrity_hook.py` signals (never blocks) archive and backup items past their retention window. The policy lives in a machine-readable `RETENTIE` block of `BRAIN/archive/README.md` — `permanent` exempts only the curated knowledge archive, while `INFRA/backups` entries always age out (180 days, 5 MB budget) — and `setup.sh` creates that README on a fresh install.
- **Unpublished-tooling reminder at closeout**: `publish.sh` writes `~/.config/maccha/last_publish` whenever the local tooling matches the repo, and the integrity hook raises a non-blocking "run publish.sh" reminder when anything in `~/bin/maccha` is newer.
- **Weekly link check** (`hooks/link-check.cjs`, a curated English copy shipped beside the other capsule hooks): validates every zonal and `file://` path inside the knowledge documents. It is a real gate — exit 0/1/2, a hard error when a source file cannot be read, and URL-encoded (`%20`) targets decoded with a raw-path fallback. `session-startup` runs it on a weekly throttle and advances the throttle marker **only on a clean run**; the target list resolves per layout (`BRAIN/<file>` → `~/<file>`), so both the maintainer layout and a fresh capsule install work.
- **Memanto embedding cache**: a persistent per-item SHA256 cache avoids re-embedding unchanged memories. Candidates are chunked to ≤100 items with 65 s pacing to respect the free-tier 100-items/min limit, plus 429 retry with exponential backoff while the keyword fallback stays in place — a warm cache means exactly one query embedding per recall.
- **Context-budget check**: new non-blocking `check_context_budget()` in the integrity hook, with the norm read from the `Context Efficiency` line of `BRAIN/AGENTS.md` (raised 2500 → **3333** tokens, matching the trimmed Dutch runtime file).
- `compose-mail`: `--cc` option for copying recipients, and `**bold**` inline markup is escaped instead of leaking into the message.
- Maintenance playbooks under `brain/maintenance/`: mandate-budget maintenance and TMS hygiene.

### Changed
- Quick Start clones over **HTTPS** instead of SSH. The documented SSH remote requires a GitHub key on the target machine, which a fresh demo laptop does not have.
- `maccha-doctor`: the personal/job-hunt section now requires `--local`. A screen-shared health check no longer prints job-search status by default. `--help` added; unknown options exit 2.
- `setup.sh`: the remaining Dutch prompts and messages are English. Non-interactive runs were already safe (`[ -t 0 ]` guard) and stay that way.
- **Language gate: marker list extended, exception made explicit.** The 55 markers were a proxy and let real Dutch through in six published files; the list now covers high-frequency Dutch function words. `tms_shortlist_sync.py` is excluded **by name** (it ships a Dutch stopword list for Dutch-language text analysis — that is its function), so the exception is a documented choice instead of a coincidence.
- The six files the extended gate caught are translated: `calendar-add.js`, `clean-prune-purge.sh`, `firestore-read/write/delete.sh`, `run_deep_research.js`, `ga-inventory.py`, plus a Dutch comment in `memanto_engine.py`. Message strings only — no behaviour changed.
- **English-only publication finished** for the Dutch strings that had never shipped (messages and comments only, no behaviour change): `maccha-doctor` (job-hunt section), `maccha-backup`, `session-startup`, `tms_integrity_hook` (and its `INFRA/maintenance` symlink copy), `tms_prune.js` and `mydrive-access-tool.js`.
- `compose-mail` reads the mail `From` addresses from a local `~/.config/maccha/accounts.json` (0600) and fails closed with an actionable message when it is missing — the published copy therefore ships **zero** personal addresses.
- **Bootstrap mandates deduplicated** (−80 lines, every mandate retained) and the generic rules the bootstrap was missing synced: outgoing email, Himalaya accounts, context budget, filename convention, secrets storage, bounty audit and live-first guidance.
- **TMS line limit**: the integrity hook enforces a 1200-character maximum per TMS line and auto-prunes `IMPROVEMENT.md`.
- `session-startup` checks the stale flag of the half-life situation document, and its retired-todo-view comment block is English; `safety_gate.sh`'s legacy path pattern is fixed.
- `system-brain/AGENTS.md`: closeout step 3 corrected — the agent writes the Memanto session event itself after the run (the script only announces it).
- Two lessons published to the capsule: measuring token budgets with a real tokenizer instead of a chars/4 estimate, and the Chrome-for-Testing extension loading test.
- A `SINGLE SOURCE` note atop `memanto_engine.py` warns that the runtime reaches the engine through a working-tree symlink (`~/INFRA/agents-brain/lib/…`): never replace the symlink with a copy, and remember that a branch checkout there changes runtime content immediately.

### Fixed
- **Hard PII gate missed files that were not tracked yet.** It enumerated `git ls-files`, but a file this run had just copied in is untracked at gate time — so a brand-new personal script sailed past the PII gate (and only a coincidental Dutch marker in the language gate stopped it). The gate now scans `git ls-files --cached --others --exclude-standard`, covering new files while still excluding gitignored local config. Proven with a probe file: the old enumeration returned 0 hits, the new one aborts with `PII LEAK DETECTED`.
- **macOS portability**: `maccha-doctor` (`stat -c '%a'`, `find -xtype l`), `clean-prune-purge.sh` and `cron-cleanup.sh` (`sudo apt`, `journalctl`) and `setup.sh` (PATH additions written to a `~/.bash_aliases` that zsh never sources) all assumed a GNU/Linux userland. They now probe GNU and BSD spellings, skip the Linux-only steps elsewhere, and pick the profile from `$SHELL`.
- **Memanto confidence decay had been silently dead for ~6 weeks**: a dedent nested the whole decay block under `if tzinfo is not None`, and naive timestamps are the norm. Decay now applies only the time elapsed since the last calculation (`last_decayed_at`, falling back to `created_at`), so repeated loads no longer re-multiply the same period factor — the previous behaviour would have drained every memory to `0.0` once decay ran again. `unpin_memory` resets the decay reference, and sub-threshold decay is not written away as lost.
- **Vector search silently degraded to keyword matching**: after the chunking fix, `candidates_emb.embeddings` raised an `AttributeError` on a plain list, so every recall fell back to the keyword path. The similarity loop now uses the chunked list.
- `embed_content` is chunked to 100 items: 210 memories in a single request returned `400 BatchEmbedContentsRequest` from the API's contents-per-request cap.
- `tms_shortlist_sync.py` accepts 3-character acronyms again, and the pruner removes superseded and `0.0` Memanto entries.
- `publish.sh`: a same-file symlink (a runtime symlink resolving to the repo destination itself, as with the `brain/lib` engine) is skipped instead of making a `cp` fail and aborting the whole publish — gates and publish marker included.

## [1.1.6] - 2026-09-13
### Added
- `maccha-doctor`: one-shot harness health check (core zones, root symlinks, backup freshness, secret permissions, TMS integrity, supply chain, disk space, optional vdab-swipe/repo checks, broken symlinks). Exit 0 = healthy, 1 = failure.
### Security
- Tightened `~/.config/maccha` and `~/.config/maccha/secrets` to `700` (secret files `600`) after the new doctor flagged overly broad permissions.

## [1.1.5] - 2026-09-13
### Changed
- Bumped the CI checkout action to `actions/checkout@v7` (Node 20 deprecation on GitHub runners).

## [1.1.4] - 2026-09-13
### Added
- GitHub Actions **Gates** workflow: shell/JS/Python syntax checks plus the publish sanitization/PII/language gates (`publish.sh --check-only`) on every push and pull request — a regression net for the public repo.

## [1.1.3] - 2026-09-13
### Fixed
- README accuracy: removed the documented-but-unimplemented `.publish-skip` config (now correctly "two" config files), corrected the `learned-lessons/` description (it ships a curated public mirror, not "never pushed"), and fixed the directory map (dropped the untracked `ALIASES.md`; added `hooks/` and `policies/`).
- `ga-inventory.py` is now executable (it carries a shebang).
### Added
- Documented `publish.sh --check-only` in the publishing guide.

## [1.1.2] - 2026-09-13
### Added
- `publish.sh --check-only`: runs the sanitization + PII + language gates without copying or committing (CI-safe, exit 0 on pass / 1 on leak).
### Changed
- Published lessons mirror updated with the `cp -ru` → `cp -rfL` drift finding.

## [1.1.1] - 2026-09-13
### Changed
- Hard PII gate now scans **all tracked files** (`git ls-files`) instead of only the synced folders, closing the blind spot that let a tracked config backup leak.
- Sanitization and `LOCAL-ONLY` stripping now also cover `.md`, `.json`, `.yaml` and `.yml` files.
- `publish.sh` copy step now fails loudly on errors (removed the silent `2>/dev/null || true`) and guards missing/empty source directories.
### Fixed
- Corrected the public PII lesson's example home path so it no longer resembles a real directory, and documented the synced-scope pitfall.
### Security
- Variant-proof publish-config ignores; broader sanitization rules (surname + workplace domain) and an enriched local PII wordlist.

## [1.1.0] - 2026-09-13
### Added
- Batched single-call semantic conflict detection in the memory engine (previously one LLM call per existing memory).
- Cooldown-aware `update-pnpm` (respects the 7-day `minimum-release-age`; offers wait / older-version / manual-override options).
### Changed
- `memanto prime` now prints a compact learned-lessons summary (counts + INDEX pointer) instead of the full list, cutting per-session token cost.
- TMS integrity workspace scan now ignores `build/` and `dist/`.
- `publish.sh`: reliable recursive copy (dereference symlinks, always refresh) and gates skip `node_modules/`, `__pycache__/`, `.git/`.
### Removed
- Removed `tms_shortlist_sync` functionality from `session-startup` to streamline the startup checklist.
### Fixed
- Removed personal identifiers from `brain/lib/README.md` and from example usage lines.
### Security
- Purged a mistakenly tracked `.publish-sanitize.sed.backup` and all personal identifiers from the entire git history (commits + tags rewritten); publish sanitization backups are now gitignored.
