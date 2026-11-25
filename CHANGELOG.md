# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
- **`checkpoint-review.js` — lifecycle for checkpoint blocks in `in-progress.md`.** Checkpoint blocks are compaction safety-nets, not tasks: they carry no checkbox, so `tms-expiry-review.js` and `tms-review-queue.js` never saw them and finished blocks piled up (the 25/11 session found four stale blocks, one of them done days earlier while its block was never closed). The new tool classifies by *content*, not by the heading label: `HANDLED` (carries `- afgehandeld:`, ready to archive), `DONE` (title says AFGEROND/Afgesloten, or a `verouderd:`/`afgehandeld:` marker), `VERIFY` (active block older than 3d without a done label — cross-check its next step against `done.md`), `OLD-ACTIVE` (>7d) and `ACTIVE`. `--stale` surfaces finished/stale/verify blocks at `session-startup`; `/closeout` owns the cleanup (lessons → LTAIS, next step → TMS, one line → `done.md`, mark `- afgehandeld: DD/MM/YYYY`, then `--archive` moves only marked blocks to `BRAIN/archive/tms/` with a `~/scratch/` backup + atomic rename). It never wipes an unmarked block. Wired into `session-startup` (`--stale`) and `session-closeout` (full queue + archive hint).
### Changed
- **`publish.sh` language gate excludes `checkpoint-review.js` by name.** The tool matches Dutch TMS markers by function (headings `(AFGEROND)`, block lines `- afgehandeld:` / `- verouderd:` / `- les-kandidaat:` / `- Volgende stap:`) — the Dutch tokens are its input, so the file is excluded like `tms_shortlist_sync.py` rather than translated into something that no longer matches the local TMS.
- **`/checkpoint` is now documented in the public capsule.** `README.md` explains the mid-session ritual next to closeout, and `system-brain/AGENTS.md` gained a generic `Checkpoint Protocol` section (what to write, that it is not a task, and the closeout-owned cleanup). The private owner-specific mandate (LTAIS exceed-check, Memanto `Event`) stays local — the public text only carries the generic procedure and the tool's literal marker names.

## [1.7.0] - 2026-11-21
### Added
- **`tms-review-queue.js` — one-at-a-time HITL review queue for the whole TMS.** `tms-expiry-review.js` covered freshness only; this broader tool groups every problematic open line under one badge and rank so nothing is reviewed in isolation. Badges: `OVERDUE-HARD` (a `deadline` passed), `OVERDUE-TIER` (logged longer ago than the tier window), `NEAR` (>70% of the window, or a deadline within 14 days), `MISPLACED` (a tier that does not belong in the file — e.g. Sprint/Strategic older than 30d in `todo.md`, or Ephemeral/Sprint in `backlog.md`), `FIRE` (a lone 🔥 without a deadline older than 21d, i.e. flame-inflation), `DUP-TITLE` (the same title on several open lines) and `OK`. Backlog is treated as parked: no tier-age-decay there, only tier/deadline/dupe/flame checks. It only *prints* the queue — the agent walks it line by line with the user and applies each decision; it never edits a file.
- **`tms-review` skill — the companion procedure for the queue.** A hand-maintained, generic English `SKILL.md` (in `skills/`) documenting the HITL walkthrough: present one line, the user decides (extend / split / de-tier / park->backlog / close->done / drop the flame / delete), the agent applies. Encodes the "important != urgent" rule (a 🔥 means "now", not "important") and the golden-margin rule (never a batch of decisions).

## [1.6.0] - 2026-11-21
### Added
- **`tms-expiry-review.js` — expired / near-expiry TMS tasks as a HITL review queue.** The existing `auditActiveTms()` logged 7d/21d overruns but nothing acted on them, so stale `[Sprint]` items silently piled up. The new tool scans `todo.md` + `in-progress.md` and flags each task `OVERDUE-HARD` (a `deadline` passed), `OVERDUE-TIER` (logged longer ago than the tier window) or `NEAR` (past 70% of the window, or a deadline within 14 days). It only *prints* the queue — the agent puts each item to the user (extend / remove to `done.md` / park to `backlog.md`) and applies the decision; it never edits a file itself. It also requires splitting the single `(DD/MM)` field into two distinct meanings: `(DD/MM)` = created/last-reviewed (freshness) vs `deadline DD/MM` = a hard external date, so "overdue" is actually computable. Wired into `session-startup` (every start) and `session-closeout` (step 1).
- **`key-rotate-check` — API-key rotation register watcher.** Reads `secrets/API_KEYS.md` (metadata only, no key values) and reports four things: overdue/near-overdue keys, `dead` files still on disk, key files with no register row, and wrong `secrets/` permissions (700/600). Exit code 1 when anything needs attention.
- **`check_duplicate_lessons()` exceed-check in `tms_integrity_hook.py`.** After recent lessons are edited, cross-compares them against all other lessons; high overlap without a cross-link is reported as a warn-only ⚠️ so the closeout must either link the lessons or drop the duplicate instead of silently answering the warning away.

### Changed
- **`memanto prime` defaults to a one-line router pointer.** `ROUTER.md` is already auto-injected on OpenCode (`opencode.jsonc` instructions), so embedding it again paid for it twice per session. A new `--with-router` flag embeds the full router for harnesses that do not inject it (e.g. Claude).
- **`maccha-doctor` reports a closed Chrome as info, not a warning.** A disconnected browse extension is only a fault when Chrome is running; with no browser there is nothing to pair, so the report distinguishes "extension not paired" from "browser simply closed".

### Fixed
- **`calendar-read --list` broke for auth-only events.** `calendar-add.js` requested only `calendar.events`; it now also requests `calendar.readonly`, which the list call needs.
- **The shipped `infrastructure/maintenance/tms_integrity_hook.py` drifted from `cli-tools/tms_integrity_hook.py`.** Both copies are now in sync, and a stray `echo` was removed from `session-startup`.
- **pnpm 12 config moved to `config.yaml`; the obsolete `tms_shortlist_sync.py` was dropped** (169 lines of dead sync logic), along with the `count-tokens`/`maccha-doctor`/`update-pnpm` adjustments that go with it.

## [1.5.2] - 2026-11-16
### Fixed
- **`tms_integrity_hook.py` rejected the lesson layout the repo ships.** `check_index_coverage()` demanded an `INDEX.md` per category and `check_learned_lessons_integrity()` treated every file without frontmatter as "not a domain file" — but the v1.5.0+ router layout has no `INDEX.md` and identifies a domain file exactly by that missing frontmatter. Every fresh install therefore ended on 🔴 with nine `No frontmatter and not a domain file` lines and two `Missing INDEX.md` lines. A domain file is now derived from the content when no `INDEX.md` exists; the INDEX lesson-count check runs only where an `INDEX.md` is kept (the local bank), so both layouts are validated without reintroducing the file the template forbids.
- **The English guardrails template was unreadable for the hook.** `parse_guardrails()` only knew the Dutch keys (`naam`/`actief`/`bron`/`sectie`) and the Dutch rule type, while `system-brain/policies/guardrails.md` documents `name`/`active`/`source`/`section` and `forbidden-terms-in-active-tms` — the shipped example therefore printed `unknown type` and a user who set `active: yes` got a guardrail that never ran. Both key sets and both type names are accepted; an unknown key is ignored, which is how an English `type:` silently became a no-op.
- **`check_context_budget()` only looked for "Context Efficiency".** The template row is labelled "Context budget", so a fresh install always printed the fallback warning instead of reading the 3333 from the mandate file (same value, so the warning was the only visible symptom — but editing the budget in the template had no effect).
- **`setup.sh` copied the TMS trackers into `~/` instead of `~/BRAIN/tms/`.** Tier 4 of the mandate map, the template `AGENTS.md` and `tms_integrity_hook.py` all read `~/BRAIN/tms/`, while `session-startup` reads `~/todo.md` — so a fresh install ended up with two truths and the integrity hook validated an empty TMS directory. The capsule now owns `BRAIN/tms/<file>` and the home-root names are symlinks into it (same layout as `~/AGENTS.md`); a pre-existing regular file is *moved* into the capsule, never copied, so no second copy can drift. `uninstall.sh` removes the link and then the target.
- **`uninstall.sh` looked for the CLI tools in `~/bin/` while `setup.sh` installs them in `~/bin/maccha/`.** Every tool compared as "absent", so a full uninstall left all 34 scripts behind while the report claimed a clean removal. It also skipped `backlog.md`, `skills/`, `BRAIN/archive/README.md` and the empty `bin/`, `BRAIN/tms/` directories, and it referenced an `info/systeem-info/laptop-setup.md` that neither exists in the repo nor is ever installed.
- **`copy_always` nested the directory it copied on every re-run** (`INFRA/agents-brain/lib/lib/…`) because it copied `src` instead of `src/.`; uninstall then compared the wrong path and left the nested copy behind.
- **`consider_tree` produced broken destination paths for `skills/*/`** (the trailing slash defeated the prefix strip), so no skill file was ever compared — the skills were installed but invisible to the uninstaller.
- **`uninstall.sh` printed a phantom `Kept (edited by you): (1)`** for every empty ledger: `"${arr[@]:-}"` expands to a single empty string, so the count was 1 with nothing listed underneath.

## [1.5.1] - 2026-11-15
### Fixed
- **`setup.sh` installed lessons to `~/learned-lessons/`, not `~/BRAIN/learned-lessons/`.** Tier 6 of the mandate map and every tool read the BRAIN path, so a fresh install started with its knowledge base in a place no agent would look — the same class of fault as the `AGENTS.md` path: the installer built a directory the mandate never mentions. `setup.sh`, `uninstall.sh` and the `publish.sh` hint now agree with the mandate, and the uninstall report lists the lessons under `~/BRAIN`.
- **The starter bank never actually shipped.** `.gitignore` ignores `/learned-lessons/*` except `README.md`, so the 12 tracked lessons went out but no router and no domain file could be added: a fresh install would have lessons with no map and no place to add the next one. The starter bank is now explicitly allowed (router, domain files, lessons); the private bank in `~/BRAIN/learned-lessons/` still never enters the repo.
- **The published starter lessons were still in the pre-router format.** `learned-lessons/` shipped an `INDEX.md` with `## Domain:` headings, which the 1.5.0 template explicitly forbids ("never in `INDEX.md`"). The 12 lessons are regrouped into 9 domain files with a `ROUTER.md`; `learned-lessons/README.md` now documents that layout instead of calling the directory an empty placeholder.

## [1.5.0] - 2026-11-15
### Added
- **Lesson routing: one router instead of one 15k-token index.** `learned-lessons/ROUTER.md` lists 32 domains with a "use it when" line and is loaded *ambiently* (OpenCode `instructions`, and `memanto prime`). A domain file holds at most ~23 lessons instead of 157 in a single `INDEX.md`; `infrastructure-en-tooling` alone was split into eight. The previous design had a write path (frontmatter check, INDEX coverage) but no read path: the startup hook was registered nowhere, `prime` printed only counts, and nothing said *when* to look — so the same lesson was written twice. `MISSES.md` is the instrument that shows whether routing works: one line per lesson found too late.
- **`system-brain/MANDATE_GUIDE.md`**: the read-once rationale (layer structure, zone model, working-memory rules, codeword design) moved out of the mandate file into a document you read at install. The template links to it, and `setup.sh` installs it next to `BRAIN/AGENTS.md` so the link resolves.

### Changed
- **`system-brain/AGENTS.md` is now the template, `~/BRAIN/AGENTS.md` the instance.** `setup.sh` installs the template as `BRAIN/AGENTS.md` and points `~/AGENTS.md` at it with a symlink, instead of copying it to `~/AGENTS.md`. The tier map used to promise a `~/BRAIN/AGENTS.md` that was never created, so a fresh install got a document that contradicted its own file layout.
- **The template carries only what applies to every session.** Layer structure condensed to a table (895 → ~150 tokens), the package and key-location sections moved to the guide, and the bounty rules (4-point audit, honeypot filter, live-first) removed: domain rules belong in `learned-lessons/`, not in a file every new user inherits. Template size 3,413 → **2,615 tokens**, below the live mandate file (2,796) rather than above it.
- **`memanto prime` prints the router instead of lesson counts.** Counts told an agent that lessons existed; the router tells it which one to open.
- **The integrity hook checks coverage in both directions.** It now validates `domain:` against a closed set, the INDEX count against the domain file, ROUTER coverage, and dead links — and it matches the lesson *link*, not a filename substring, so a lesson stripped of its link can no longer pass as covered.
- **README**: refined description of what MACCHA is and who it is for; the HITL bullet gained its closing period.

### Fixed
- **`setup.sh` aborted on a directory.** `cli-tools/__pycache__` hit `cp` without `-r`, and `infrastructure/manual-scrcpy.txt` no longer exists; under `set -e` both stopped the install before step 4, leaving a half-configured machine. Missing or non-file sources are now skipped.
- **`uninstall.sh` aborted on `consider()`.** `[ -e "$repo" ] || return` returned 1 for a missing source and `set -e` turned that into a full abort; it now returns 0.

## [1.4.1] - 2026-10-28
### Fixed
- **`cli-tools/update-pnpm`: the cooldown guard was inert and the update never reached the binary on PATH.** Two independent faults, both silent. (1) The script installed through `npm install -g pnpm@latest`, but `minimum-release-age` is a **pnpm/bun** setting: npm reports it as `Unknown user config` and ignores it, so the cooldown branch was dead code and the updater installed exactly the releases the guardrail exists to hold back. It now reads the cooldown from `~/.npmrc` (default 7 days), takes **all** release dates from a single `npm view pnpm time --json` call, and picks the newest stable version that is old enough — the previous fallback issued one `npm view` per released version, which looked like a hang. (2) `npm`'s global prefix is the nvm node directory, which sits **behind** `~/.npm-global` on PATH, so a global install landed in a directory nothing ever executes and `pnpm -v` never changed — the symptom that made the script "not work optimally". The update now goes through `pnpm self-update <version> --yes` (pnpm replaces its own binary, so the one on PATH is always the one updated), with an explicit `--prefix ~/.npm-global` npm fallback for installs pnpm refuses to self-update. It verifies the result against the target version and warns when another pnpm copy on the system drifts from it — four entry points existed here (`~/.npm-global`, `~/.local/bin` → corepack, `/usr/bin` → corepack, and pnpm's standalone launcher), all reporting the same version but resolved by PATH order alone.
  *Consequence worth stating:* a cooldown written into `.npmrc` protects only the package manager that understands it. Any tool updated through a *different* manager silently falls outside the guardrail.

## [1.4.0] - 2026-10-26
### Added
- **Two-horizon TMS (`todo.md` + `backlog.md`), 300-char pointer rule, and automatic tier-expiry audit (`tms_prune.js`)**: separates active tasks (≤30 days, loaded at `start`) from parked/long-term tasks (`backlog.md`, excluded from `start` context), caps every active task line at **300 characters** (next action + link only; chronological history stays in the owner dossier), ships five universal PII-free domain headings in `system-brain/todo.md` and `system-brain/backlog.md`, and adds `auditActiveTms()` to `infrastructure/maintenance/tms_prune.js` to flag `[Ephemeral]` (>7d) and `[Sprint]` (>21d) items past their expiry window.

### Changed
- **`system-brain/AGENTS.md`: the codeword rule is now its own self-contained block.** The template preached that a definition must be self-contained while keeping its own codeword definition buried in a 300-word paragraph about memory layers. The paragraph now stops at the layer itself (three jobs, what must never be copied in, and why), and the rule follows under its own heading — `Owner first — always, and on the signal "persist this"` — with the criterion stated in full, the two clauses that were still missing from the mirror (**never a second copy**; say *where* it landed, not what you stored; in doubt name the candidates — dossier, mandate file, or memory layer), and the codeword kept as a shorthand rather than a substitute for the rule.

### Removed
- **`cli-tools/session-startup`**: removed obsolete weekly Saturday shopping reminder (personal reminder, no longer applicable).

## [1.3.0] - 2026-10-18
### Added
- **`mail-check` (cli-tools/)**: one read-only call that answers "check my mail" across *every* configured account, reading each account's All-Mail folder instead of the INBOX default (which covers a single account and misses whatever Gmail filed into labels). It carries no configuration: accounts come from `himalaya account list`, and the All-Mail folder is found by its IMAP `\All` attribute via `folder list -o json` — so the Dutch/English mailbox split (`[Gmail]/Alle e-mail` vs `[Gmail]/All Mail`) never has to be guessed, and a new account needs no edit. Output lists date, unread marker, sender, subject and the folder-local message id, plus the exact `message read` command per account; `--days`, `--unread`, `--account` and `--json` narrow it.
- **Working-memory rule in the `system-brain/AGENTS.md` template**: the template now states what the Memanto layer is *for* — session `Event`s, behavioural entries (`Instruction`/`Preference`/`Decision`/`Goal`), and references — and what it must never hold: a second copy of anything that already has an owner file (amounts, links, appointments, statuses). It ships the decision test (*"if this changes, which file must change with it?"*) and how to read the owner's *"put this in your memory"* — that phrase names an outcome ("make sure it stays findable"), not a store, so the normal answer is an owner file plus a reference. The rule's owner is the maintainer's private `BRAIN/AGENTS.md`; the template carries the mirror because `brain/lib/memanto_engine.py` ships here.
- **One codeword instead of a phrasing glossary (`system-brain/AGENTS.md`)**: the template now tells the implementer to agree **one** codeword for *"make sure this stays findable"* (English default `/persist`) rather than listing spellings — the codeword points at the test that is already in the mandate, so the mandate stays short. It also ships the design rule behind the choice: **name the outcome, not the store** — a codeword meaning *"save it"* or *"remember it"* pulls an agent toward the memory layer, which the working-memory rule forbids, whereas one meaning *"this must persist"* forces it to ask *where* the fact belongs. The step-by-step procedure is **not** parked in a per-agent slash command: commands live under a different path and in a different format in every harness (OpenCode `~/.config/opencode/command/`, Claude Code `~/.claude/commands/`, Gemini CLI TOML), so one codeword would need one copy per harness — exactly the duplication the working-memory rule forbids.
- **Bundled agent skills (`skills/`)**: a new home for drop-in skills — plain `SKILL.md` files with YAML frontmatter that any harness reading a skills directory will pick up. First entry is `step-by-step`: patient one-step-at-a-time guidance with an explicit "the user holds the reins" rule, the opposite of the always-on agent that acts first and reports later. The directory is **hand-maintained in this repository, deliberately static** (like the `system-brain/` templates): the maintainer's personal Dutch-language variants live in a local `~/BRAIN/skills/` and are a *different artefact* — a published skill is a translation that may lag on purpose, so there is no `publish.sh` wiring and no allowlist line (see `skills/README.md`). `skills` is in `SYNC_DIRS` so the language and PII gates still cover it; `setup.sh` installs the bundled skills into `~/.agents/skills/` (plus `~/.claude/skills/` when that harness directory already exists), never overwriting an existing skill; and the public `system-brain/AGENTS.md` template documents the activation phrases so a fresh install knows the skill exists.
- **Release-drift reminder at closeout**: the integrity hook now warns (never blocks) when the capsule tag falls behind — 10+ commits since the newest tag, 30+ days since the tagged commit, or a `VERSION` bump without a matching tag. `publish.sh` deliberately does not couple a publish run to a release, so this check is the only signal that the tag is lagging (it once sat 27 commits and five weeks behind `v1.1.6`). Local only: it never contacts the remote.

### Fixed
- **`brain/lib/memanto_engine.py`: silent degradation when the API key is unreachable, plus a retired model id.** Two faults, one symptom. (1) The engine reads `GEMINI_API_KEY` from `~/.gemini/.env` → `~/.env` → `./.env`; when none of those exists it falls back to Vertex AI with the literal placeholder project id `your-vertex-project-id`, which fails with 403 (the Vertex route was closed anyway: billing is disabled on the project, and only the `generativelanguage` API is enabled there). (2) Even with a key, the hardcoded `gemini-2.5-flash` is *"no longer available to new users"* (404). The damage stayed invisible because embeddings are computed **lazily on `recall`**, never on `remember`: writes kept succeeding while search quietly degraded to keyword overlap — a path that still returns plausible results, so 24 of 203 entries (all session events of 14–17 October) silently had no vector. The generative model is now overridable via `MEMANTO_MODEL` (default `gemini-3.5-flash`), and the engine warns explicitly on both silent paths: using the placeholder project id, and writing an entry with no client (hence no vector). Entries already stored were re-embedded with `warmup_cache()`.
- `warmup_cache()`'s docstring claimed it returns "the count of newly embedded items" while it returns the **net** vector-cache delta (`len(self.cache) - before_count`), so pruning stale hashes can make the number negative — as it did when 10 entries were rewritten and 5 forgotten. The return value is unchanged (callers rely on the net delta); only the contract is now stated accurately.

### Changed
- **The codeword definition is now self-contained (`system-brain/AGENTS.md`)**: a definition that says *"apply the test above"* is not a definition — an agent can be handed one heading with its paragraph and nothing else, so the criterion is stated in full where the codeword lives, and a word meaning *"this must persist"* forces the agent to ask *where*. Measured on the maintainer's own install: dropping the slash command and folding the criterion back into the mandate kept the codeword working in every harness while ending up **shorter** than the two lines it replaced.
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
