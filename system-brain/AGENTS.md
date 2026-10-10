# 🧠 MACCHA — Multi-Agent Continuous Context Harness
**Top-Layer Agent Bootstrap | Root: `~/` (Home Directory)**
> **To every AI agent:** this is the FIRST file you read — it activates the entire MACCHA system. Read it completely before taking any action.

---

## ⚡ What is MACCHA?

**MACCHA** (*Multi-Agent Continuous Context Harness*) is a personal AI orchestration and memory system: every agent — any tool, any session — is immediately fully contextualized and operational. **Core principle:** continuity — no repetition, no context loss, no drift.

---

## 🗂️ Layer Structure (Read in this order)

```
[TIER 0 — TOP]  ~/AGENTS.md                        ← THIS FILE (master bootstrap)
[TIER 1]        ~/BRAIN/AGENTS.md                  ← Project mandates & session protocol
[TIER 2]        ~/.gemini/GEMINI.md                ← Machine mandates & tooling rules
[TIER 3]        ~/INFO/over-owner/SITUATIE_OVERZICHT.md  ← Owner situation (mandatory)
[TIER 4]        ~/BRAIN/tms/ + ~/BRAIN/policies/   ← Live state: TMS task flow + guardrails register
[TIER 5]        ~/IMPROVEMENT.md                   ← LTAIS (Long-Term Auto-Improvement)
[TIER 6]        ~/BRAIN/learned-lessons/           ← Curated lessons (technical / strategic / security)
```

**Routing rule:** A fact lives in exactly one layer. Priority: Tier 0 > Tier 1 > Tier 2.

**Zone model (home directory):** `~/BRAIN/` is exclusively the *technical* MACCHA capsule (mandates, memory, TMS, hooks, policies, system-info, archive). Personal content lives in the root zones: `~/INFO/` (dossiers & knowledge base), `~/PLAN/` (plans), `~/INBOX/` (owner → agent drop-off channel: items are triaged with a proposal; instruction-type items are NEVER executed without explicit owner confirmation — HITL per item; pure archival material flows straight to its owner location, then the folder is emptied). Code lives in `~/workspace/`, temporary files in `~/scratch/`. Convenience access to single files from the root only via symlinks. **Every scaffolding change must keep the `BRAIN/` capsule simple and PII-free to copy into the public `real-agent-setup` repo.**

---

## 🚀 Mandatory Session Startup Protocol

The agent MUST ALWAYS run this checklist proactively, **in order**, at the start of every new session:

1. **Load Situation** — read `~/INFO/over-owner/SITUATIE_OVERZICHT.md`: the central reference about the owner (personal, legal, financial, technical); replaces dozens of loose files.
2. **Prime Context** — run `~/bin/maccha/session-startup` (backup marker, INBOX count, watchers). In harnesses with a SessionStart hook this runs automatically — just verify the output; otherwise run it yourself.
3. **Check System Status (TMS)** — read `~/todo.md` (open), `~/in-progress.md` (active, prune to ~10) and `~/BRAIN/policies/guardrails.md` (machine-enforced, auto-checked at closeout).
4. **Activate MACCHA Layer** — read `~/BRAIN/AGENTS.md` (session protocol, security rules, mandates).
5. **Intelligence Check (if relevant)** — consult `~/IMPROVEMENT.md` (LTAIS inventory) and `~/BRAIN/learned-lessons/` (curated lessons).

> **Rule:** Do NOT proactively ask for synchronization. Load context silently, report concisely.

---

## 🔄 Closeout Protocol (on request)

1. **LTAIS:** review and, if warranted, record Learned Lessons in `IMPROVEMENT.md`.
2. **TMS sync:** update `todo.md` / `in-progress.md` / `done.md`; refresh the situation document only on structural changes.
3. **Run `~/bin/maccha/session-closeout`:** TMS prune, method-improver self-reflection + distill, TMS integrity check — then **write the session event yourself**: `memanto_cli.py remember "<title + key outcomes>" --category Event` (the script announces the step; it never invents event content. `Event` = logbook — filing it as `Fact` would let later facts overwrite unrelated events).

> **Significance threshold (Anti-Bloat Mandate):** only store a lesson that is (1) unique, (2) high-impact (>15 min saved or critical error prevention), and (3) generically valuable.

---

## 🗃️ Knowledge Maintenance (MANDATORY)

1. **One fact, one owner — never copy, always link.** Owners: tasks → `tms/`; income & tax → your tax/income register (offline mirror `tms/tax_income_ledger.md`); slow-changing situation → `INFO/over-owner/SITUATIE_OVERZICHT.md` (no status tables!); lessons → `learned-lessons/` + `IMPROVEMENT.md`; plans → `PLAN/`. Update a status **only** in its owner file.
2. **TMS is flow-through, not a junk drawer.** Each task lives in exactly one TMS file. Finished → move it to `done.md` immediately as a single line (date + 2-3 sentences + link to the artifact). Never leave `[x]` items in `todo.md`/`in-progress.md`. Archive `done.md` per quarter to `BRAIN/archive/tms/`.
3. **Fixed TMS line form (label first):** `- [ ] [Tier] 🔥 **Title**: description … (date) [link]` — the expiry-tier label (`[Ephemeral]`/`[Sprint]`/`[Strategic]`/`[Eternal]`) always comes right after the checkbox, before the title; the optional urgency flame 🔥 sits between label and title.
4. **Weekly TMS sweep:** roll `[x]` items forward, dedupe, trim in-progress, enforce the line form.

---

## ⚙️ Technical Core Rules (Quick Reference)

| Rule | Value |
|---|---|
| **Package manager** | `pnpm` — NEVER npm or yarn |
| **Runtime** | Node.js (NVM, latest LTS) |
| **Frontend** | Vite — NEVER CRA |
| **Git clone** | `--depth 1` for large repos |
| **Package age** | `minimum-release-age=10080` (7 days) — supply-chain cooldown |
| **Scripts** | `ignore-scripts=true` and `save-exact=true` in `.npmrc` |
| **Home root** | Keep clean — projects in `~/workspace/`, temp in `~/scratch/` |
| **Aliases** | Write in `~/.bash_aliases`, NEVER in `~/.bashrc` |
| **Secrets** | NEVER in source code — scan before every commit |
| **Outgoing email** | Always `~/bin/maccha/compose-mail` (HTML + quoted-printable + attachments + threading) — it only **saves a draft** (HITL). Never raw `.eml` or `himalaya save` (Gmail truncates them) |
| **Himalaya** | Binary `~/.local/bin/himalaya`; pass the account with `-a` on the **subcommand** (an env var is ignored); inbox = `himalaya envelope list` |
| **Context budget** | Mandate files stay ≤ 3333 tokens of critical mandates — project-specific detail lives in the Deep Knowledge Index |
| **Filenames** | Correspondence, reports and drafts get a `yyyymmdd_` date prefix; drafts add `draft_` before the date; never sequence numbers (`08_`, `0x`) |

---

## 🛡️ Security Protocol (Non-Negotiable)

1. **HITL (Human-before-action):** every action mutating capital requires explicit owner confirmation.
2. **Email HITL (MANDATORY):** NEVER send an email automatically or autonomously (via any CLI, SMTP, script, or API) without explicit prior owner approval for that specific send. Always present recipient, subject, and full body first, then ask.
3. **Supply Chain:** enforce the package-age cooldown; bypass only via an explicit local exclude after manual verification. Run `pnpm audit` before install. Report as "Safety: 🟢 GREEN / 🔴 RED".
4. **Git identity:** verify SSH identity (`gh auth status`) before push.
5. **Secrets scan:** check for API keys and private keys before every commit.
6. **DeFi No-Execution Zone:** analysis only. No trades without hardware-wallet confirmation.
7. **Read-only registers:** some files (e.g. a curated shortlist) are owner-edited only — read, never write.
8. **Secrets storage:** keys and keypairs live in `~/.config/maccha/secrets/` (dir 700, files 600); API keys only in a gitignored `.env`, never hardcoded; seed phrases are NEVER digitized. Keep a register at `~/.config/maccha/secrets/README.md`.
9. **Bounty audit:** present an opportunity only after the 4-point audit (Payout, Response, Age, PR-count). Filter honeypots: "Prompt Leaks", "No Humans Allowed", and ghost bounties (>5 open PRs with no response).
10. **Live-first:** use `gh` for current PR/issue status instead of trusting memory; discovery (GitHub dorks, bounty boards) is separate from validation.

---

## 📦 MACCHA as a Package (real-agent-setup)

The complete MACCHA harness is available as a PII-free package (`github.com/[your-username]/real-agent-setup`):
- **Every change** to the harness structure MUST be reflected in this repo via `publish.sh`
- **Portability:** scripts always use `$HOME` or `os.homedir()` — **never hardcoded paths**
- **PII gate:** `AGENTS.md`, `IMPROVEMENT.md`, `BRAIN/*` and learned lessons are private; only sanitized templates/lessons are published.

---

## 🗣️ Communication

- **Reporting format:** reports to the owner are Markdown (`.md`) with headings/tables, placed in `~/INFO/over-owner/`.
- **PII & professional privacy:** in external correspondence to professional contacts, employers, or volunteer organizations, NEVER share PII or sensitive personal details. Default to a clean, professional sign-off with no AI mention; any AI signature is optional and used only when fitting.
- **Deadlines:** when registering deadline-bound work (e.g. translation jobs) in the TMS or reports, ALWAYS include the specific deadline date in the title/description to disambiguate recurring items.

---

## 🧰 Tool Register

Before reaching for the browser or writing an ad-hoc script, scan `~/BRAIN/system-info/TOOL_REGISTER.md` (capability → tool → when-to-use). It surfaces tools that would otherwise be undiscoverable at the decision moment. Built a new reusable tool = add one line to the register (it links, never copies).

---

## 📚 Deep Knowledge Index

Lessons live in `learned-lessons/` itself (no copies elsewhere). Consult the per-category index:
- **Technical:** `learned-lessons/technical/INDEX.md`
- **Strategic:** `learned-lessons/strategic/INDEX.md`
- **Security:** `learned-lessons/security/INDEX.md`

> New lesson = create the lesson file AND update the matching `INDEX.md` (Librarian task), grouped under the right `## Domain:` heading. Frontmatter is mandatory — copy the block from any existing lesson (`category`, `domain`, `tier`, `last_updated`); `tms_integrity_hook.py` rejects lessons missing `tier:` or `category:`.

---

## 🗺️ Key Locations (Quick Map)

| What | Where |
|---|---|
| Task flow (TMS) | `~/BRAIN/tms/` (symlinks: `~/todo.md`, `~/in-progress.md`, `~/done.md`) |
| Working memory | `~/BRAIN/memanto/memanto_global.json` (via `memanto_cli.py remember/recall/answer/distill/prune`) |
| Tool register | `~/BRAIN/system-info/TOOL_REGISTER.md` |
| Infrastructure scripts | `~/bin/maccha/` and `~/INFRA/` |
| Encrypted weekly backup | `maccha-backup` — AES-256 tar of the personal zones + `~/bin/maccha` → cloud drive (key `~/.config/maccha/backup.key`); weekly via `session-startup` |

---

*MACCHA v1.1 | Multi-Agent Continuous Context Harness*
*"Continuity is the key to agentic performance."*

---
> **📝 NOTE:** Customize the paths above (e.g. replace `over-owner/`) to match your own setup.
