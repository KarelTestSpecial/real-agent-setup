# 🧠 MACCHA — Multi-Agent Continuous Context Harness
**Top-Layer Agent Bootstrap | Root: `~/` (Home Directory)**
> **To every AI agent:** This is the FIRST file you read. It activates the entire MACCHA system.
> Read this document completely before taking any action.

---

## ⚡ What is MACCHA?

**MACCHA** (*Multi-Agent Continuous Context Harness*) is a personal AI orchestration and memory system. It is designed so that every AI agent — regardless of which tool or session — is immediately fully contextualized and operationalized.

**Core principle:** Continuity across sessions, agents, and tools. No repetition, no context loss, no drift.

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

**Zone model (home directory):** `~/BRAIN/` is exclusively the *technical* MACCHA capsule (mandates, memory, TMS, hooks, policies, system-info, archive). Personal content lives in the root zones: `~/INFO/` (dossiers & knowledge base), `~/PLAN/` (plans), `~/INBOX/` (owner → agent drop-off channel: every item gets processed to its owner location, then the folder is emptied). Code lives in `~/workspace/`, temporary files in `~/scratch/`. Convenience access to single files from the root only via symlinks. **Every scaffolding change must keep the `BRAIN/` capsule simple and PII-free to copy into the public `real-agent-setup` repo.**

---

## 🚀 Mandatory Session Startup Protocol

The agent MUST ALWAYS run the full checklist proactively at the beginning of every new conversation/session. This is critical to ensure you have the full context before starting work. Perform the steps **in order**:

### Step 1: Load Situation
```
Read: ~/INFO/over-owner/SITUATIE_OVERZICHT.md
```
This is the central reference document about the owner (personal, legal, financial, technical). It replaces dozens of loose files.

### Step 2: Prime Context
```
Run: ~/bin/session-startup   → prime context check (backup marker, INBOX count, watchers)
```
In some harnesses this runs automatically via a SessionStart hook; there, only verify the prime output is present. Otherwise run the script yourself.

### Step 3: Check System Status (TMS)
```
Read: ~/todo.md             → Open tasks
Read: ~/in-progress.md      → Active tasks (prune to ~10)
Read: ~/BRAIN/policies/guardrails.md → Machine-enforced guardrails (auto-checked at closeout)
```

### Step 4: Activate MACCHA Layer
```
Read: ~/BRAIN/AGENTS.md     → Session protocol, security rules, mandates
```

### Step 5: Intelligence Check (if relevant)
```
Consult: ~/IMPROVEMENT.md           → LTAIS intelligence inventory
Consult: ~/BRAIN/learned-lessons/   → Specific curated lessons
```

> **Rule:** Do NOT proactively ask for synchronization. Load context silently, report concisely.

---

## 🔄 Closeout Protocol (on request)

1. **LTAIS:** review and, if warranted, record Learned Lessons in `IMPROVEMENT.md`.
2. **TMS sync:** update `todo.md` / `in-progress.md` / `done.md`; refresh the situation document only on structural changes.
3. **Run `~/bin/session-closeout`:** TMS prune, method-improver self-reflection + distill, TMS integrity check, session event in working memory.

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

---

## 🛡️ Security Protocol (Non-Negotiable)

1. **HITL (Human-before-action):** every action mutating capital requires explicit owner confirmation.
2. **Email HITL (MANDATORY):** NEVER send an email automatically or autonomously (via any CLI, SMTP, script, or API) without explicit prior owner approval for that specific send. Always present recipient, subject, and full body first, then ask.
3. **Supply Chain:** enforce the package-age cooldown; bypass only via an explicit local exclude after manual verification. Run `pnpm audit` before install. Report as "Safety: 🟢 GREEN / 🔴 RED".
4. **Git identity:** verify SSH identity (`gh auth status`) before push.
5. **Secrets scan:** check for API keys and private keys before every commit.
6. **DeFi No-Execution Zone:** analysis only. No trades without hardware-wallet confirmation.
7. **Read-only registers:** some files (e.g. a curated shortlist) are owner-edited only — read, never write.

---

## 📌 TMS (Task Management System)

| File | Location | Purpose |
|---|---|---|
| `todo.md` | `~/BRAIN/tms/` (symlink `~/todo.md`) | Open tasks + waiting-on-external |
| `in-progress.md` | `~/BRAIN/tms/` (symlink `~/in-progress.md`) | Active tasks (max ~10) |
| `done.md` | `~/BRAIN/tms/` (symlink `~/done.md`) | Completed (one line each) |

See **Knowledge Maintenance** above for the flow-through rules and line form.

---

## 📦 MACCHA as a Package (real-agent-setup)

The complete MACCHA harness is available as a PII-free, downloadable package:
- **Repo:** `github.com/[your-username]/real-agent-setup`
- **Every change** to the harness structure MUST be reflected in this repo via `publish.sh`
- **Portability:** scripts always use `$HOME` or `os.homedir()` — **never hardcoded paths**
- **PII gate:** `AGENTS.md`, `IMPROVEMENT.md`, `BRAIN/*` and learned lessons are private; only sanitized templates/lessons are published.

---

## 🗣️ Communication

- **Reporting format:** reports to the owner are Markdown (`.md`) with headings/tables, placed in `~/INFO/voor-owner/`.
- **PII & professional privacy:** in external correspondence to professional contacts, employers, or volunteer organizations, NEVER share PII or sensitive personal details. Default to a clean, professional sign-off with no AI mention; any AI signature is optional and used only when fitting.
- **Deadlines:** when registering deadline-bound work (e.g. translation jobs) in the TMS or reports, ALWAYS include the specific deadline date in the title/description to disambiguate recurring items.

---

## 🧰 Tool Register

Before reaching for the browser or writing an ad-hoc script, scan `~/BRAIN/systeem-info/TOOL_REGISTER.md` (capability → tool → when-to-use). It surfaces tools that would otherwise be undiscoverable at the decision moment. Built a new reusable tool = add one line to the register (it links, never copies).

---

## 📚 Deep Knowledge Index

Lessons live in `learned-lessons/` itself (no copies elsewhere). Consult the per-category index:
- **Technical:** `learned-lessons/technical/INDEX.md`
- **Strategic:** `learned-lessons/strategic/INDEX.md`
- **Security:** `learned-lessons/security/INDEX.md`

> New lesson = create the lesson file AND update the matching `INDEX.md` (Librarian task). Group it under the right `## Domain:` heading.

---

## 🗺️ Key Locations (Quick Map)

| What | Where |
|---|---|
| Owner situation | `~/INFO/over-owner/SITUATIE_OVERZICHT.md` |
| Plans | `~/PLAN/` |
| Inbox (owner → agent drop-off) | `~/INBOX/` (process every item to its owner location, then empty) |
| Task flow (TMS) | `~/BRAIN/tms/` (symlinks: `~/todo.md`, `~/in-progress.md`, `~/done.md`) |
| Guardrails register (machine-enforced) | `~/BRAIN/policies/guardrails.md` |
| Session protocol (detailed) | `~/BRAIN/AGENTS.md` |
| Working memory | `~/BRAIN/memanto/memanto_global.json` (via `memanto_cli.py remember/recall/answer/distill/prune`) |
| Learned lessons | `~/BRAIN/learned-lessons/` |
| Tool register | `~/BRAIN/system-info/TOOL_REGISTER.md` |
| Infrastructure scripts | `~/bin/` and `~/INFRA/` |
| Encrypted weekly backup | `maccha-backup` (AES-256 tar of personal zones → cloud drive, key in `~/.config/maccha/backup.key`, triggered by `session-startup`) |

---

*MACCHA v1.1 | Multi-Agent Continuous Context Harness*
*"Continuity is the key to agentic performance."*

---
> **📝 NOTE FOR MACCHA USERS:** Customize the paths under "Key Locations" and the situation-document path to match your own setup. Replace `over-owner/` with your own directory name.
