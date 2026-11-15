# 🧠 MACCHA — Multi-Agent Continuous Context Harness
**Template | Root: `~/` (Home Directory)**
> **This file is the template, not the instance.** `setup.sh` installs it as `~/BRAIN/AGENTS.md` and points `~/AGENTS.md` at it with a symlink. The live instance is that file in *your* home — edit it there, never here.

---

## ⚡ What is MACCHA?

**MACCHA** (*Multi-Agent Continuous Context Harness*) is a personal AI orchestration and memory system: every agent — any tool, any session — is immediately fully contextualized and operational. **Core principle:** continuity — no repetition, no context loss, no drift.

---

## 🗂️ Layer Structure

| Tier | File | Role |
|---|---|---|
| 0 | `~/AGENTS.md` | entry point — a symlink to Tier 1, not a second document |
| 1 | `~/BRAIN/AGENTS.md` | **this file** — mandates & session protocol |
| 2 | `~/.gemini/GEMINI.md` | machine mandates & tooling rules |
| 3 | `~/INFO/over-owner/SITUATIE_OVERZICHT.md` | owner situation (mandatory) |
| 4 | `~/BRAIN/tms/` + `policies/` | live state: task flow + guardrails register |
| 5 | `~/IMPROVEMENT.md` | LTAIS (long-term auto-improvement) |
| 6 | `~/BRAIN/learned-lessons/` | curated lessons (technical / strategic / security) |

A fact lives in exactly one layer; priority is Tier 0 > Tier 1 > Tier 2. The full
reasoning — zone model, working-memory rules, how to write a codeword — lives in
[`MANDATE_GUIDE.md`](MANDATE_GUIDE.md), read once at install.

### Owner first — always

*"If this changes, which file must change with it?"* If that file exists, write
it **there**, with at most one reference in Memanto. If it does not, Memanto is
the owner. **Never a second copy**, and say *where* it landed rather than what you
stored. On the signal *"persist this"*: apply the test and name the file.

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
2. **TMS is flow-through, not a junk drawer.** Each task lives in exactly one TMS file (`in-progress.md` ≤ ~10 active; `todo.md` active ≤30d; `backlog.md` parked/>30d, not loaded at `start`; `done.md` finished as one line + archived quarterly to `BRAIN/archive/tms/`). Never leave `[x]` items in active files.
3. **Fixed TMS line form (≤300 chars/line, label first):** `- [ ] [Tier] 🔥 **Title**: next action … (date) [link]` — `[Ephemeral]` (≤7d)/`[Sprint]` (≤21d)/`[Strategic]`/`[Eternal]` right after the checkbox; chronological history belongs in the owner dossier.
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

> Domain-specific working rules (bounty audits, job-application references, client
> routing) do **not** belong here. They live in the domain file of
> `~/BRAIN/learned-lessons/` — this file only carries what applies to every session.

---

## 📦 MACCHA as a Package (real-agent-setup)

The harness ships as a PII-free package. Portability (`$HOME`, never hardcoded
paths), the PII gate, and the `publish.sh` rule are in
[`MANDATE_GUIDE.md`](MANDATE_GUIDE.md).

---

## 🗣️ Communication

- **Reporting format:** reports to the owner are Markdown (`.md`) with headings/tables, placed in `~/INFO/over-owner/`.
- **PII & professional privacy:** in external correspondence to professional contacts, employers, or volunteer organizations, NEVER share PII or sensitive personal details. Default to a clean, professional sign-off with no AI mention; any AI signature is optional and used only when fitting.
- **Deadlines:** when registering deadline-bound work (e.g. translation jobs) in the TMS or reports, ALWAYS include the specific deadline date in the title/description to disambiguate recurring items.
- **Step-by-step skill:** the bundled `step-by-step` skill (see `skills/`) is a mode, not a one-off. Load it when the user says "slow down", "step by step", "walk me through it", "from step 1", or wants to keep the reins on what changes: exactly one step per message, restart at step 1, and pause before anything that sends, submits, deletes or pays. Map your own activation phrases to it here.

---

## 🧰 Tool Register

Before reaching for the browser or writing an ad-hoc script, scan `~/BRAIN/system-info/TOOL_REGISTER.md` (capability → tool → when-to-use). It surfaces tools that would otherwise be undiscoverable at the decision moment. Built a new reusable tool = add one line to the register (it links, never copies).

---

## 📚 Deep Knowledge Index

Lessons live in `learned-lessons/` itself (no copies elsewhere). **Routing:**
`learned-lessons/ROUTER.md` — one file per domain, each with a "use it when"
line. Read the router *before* you start a task, not after.

> New lesson = the lesson file (frontmatter `category`, `domain`, `tier`,
> `last_updated`) **plus** one line in the domain file of that domain — never in
> `INDEX.md`, which is only a table of contents. `tms_integrity_hook.py` enforces
> domain, count, router coverage and dead links.

---

*MACCHA v1.5.2 | Multi-Agent Continuous Context Harness*
*"Continuity is the key to agentic performance."*

---
> **📝 NOTE:** Customize the paths above (e.g. replace `over-owner/`) to match your own setup.
