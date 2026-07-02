# 🧠 MACCHA — Multi-Agent Continuous Context Harness

> **Turn Antigravity, OpenCode, Claude Code, or any other AI coding assistant into a fully contextualized, highly secure, self-improving Real-World Digital Assistant.**

**MACCHA is a lightweight file architecture, a set of intelligent markdown templates, and a suite of tools and maintenance scripts that live in your home directory. It acts as a universal, persistent "brain" that any local AI agent can plug into.**

---

## ⚡ What is MACCHA?

It solves the biggest limitation of modern AI coding agents: **transient memory and repetitive context-setting**.

When you open a new workspace or start a terminal session, standard AI assistants start from absolute zero. They forget who you are, your technical preferences, your system constraints, and the hard-earned lessons from yesterday. You have to explain your project rules over and over again.

**MACCHA solves this permanently.** By establishing a structured memory hierarchy and automated maintenance loops, any AI agent reading your system instantly inherits a persistent, self-improving, and highly protected professional profile. 

Because this memory lives directly in your file system—not in a proprietary cloud silo—**MACCHA creates a shared, evolving intelligence across different platforms.** You can switch seamlessly between Antigravity, OpenCode, and Claude Code. They will all read from and write to the same MACCHA brain, sharing a single, unified digital identity.

Imagine this:
- **Monday**: You tell Antigravity that you strictly use `pnpm` and prefer dark-mode CSS without Tailwind. The agent writes this rule to your MACCHA memory.
- **Wednesday**: You open Claude Code in a completely different project. It instantly reads MACCHA, knows your `pnpm` and CSS preferences, checks your `todo.md` to see what you're working on, and starts coding exactly the way you like.
- **Friday**: You shut everything down. No background servers are running. Your entire agentic identity rests safely in a few kilobytes of text files, ready to be instantly rehydrated next week.

---

## 🔄 The MACCHA Lifecycle (Startup & Closeout)

MACCHA is not just a static set of rules; it is a **living engine** driven by two critical rituals: Startup and Closeout. 

- **At the start of a session**, the agent will proactively read `~/AGENTS.md` and run the mandatory **Startup Protocol**. This primes your context, checks your `~/INBOX/`, verifies your TMS (`todo` / `in-progress`), and triggers throttled weekly backups. *(Note: Once you are familiar with the workflow, you could edit your personal `~/AGENTS.md` to disable the automatic trigger and only run the startup checklist when explicitly requested).*
- **At the end of a session, you MUST manually ask the agent to "run closeout"** (or run `session-closeout` yourself). Because AI agents cannot predict when you are about to close your terminal, they cannot run this automatically. **Do not skip this!** Closeout captures your newly learned lessons, syncs and prunes your TMS, and records the session event in memory.

> [!IMPORTANT]
> **Making the closeout request a habit is what turns MACCHA from a static rule file into a genuinely *self-improving* brain — each closeout compounds into the next startup.**

---

## 🆚 The MACCHA Philosophy (vs. Always-On Agents)

While projects like **Hermes Agent** and **OpenClaw** provide incredibly powerful autonomous assistants, they are typically designed as "always-on" daemons. They require heavy local computing power, continuous background processing, and constant API polling. For many users, running a heavy 24/7 node simply isn't feasible.

MACCHA is built for people who **cannot or do not want to run heavy, 24/7 background agents**, but still want the compounding benefits of a sophisticated, self-improving autonomous system.

- **Lightweight Hardware:** Runs flawlessly on constrained hardware (like Chromebooks, older laptops, or free-tier cloud environments). The agent only consumes compute when you actively invoke it.
- **Cross-Agent Synergy:** You are never locked into one tool. Antigravity can start a complex coding task today, and OpenCode can continue it tomorrow. 
- **Human-in-the-Loop (HITL) by Default:** Perfect for sensitive operations, financial tasks, or personal data. You remain the conductor. The agent acts on-demand and proposes changes; you approve them. There are no runaway background processes.
- **True Continuity:** Despite not running 24/7, MACCHA's architecture gives you the same continuous context, tool integration, and long-term memory as an always-on agent. 

**If you want the persistent memory and deep context of a sophisticated digital assistant, but need it to be highly resource-efficient and fully under your control—MACCHA is your bridge.**

---

## 🗂️ How It Works: The 7-Tier Architecture

To make this possible, MACCHA organizes your system context into seven distinct, isolated tiers. This prevents memory bloat, avoids context-drift, and enforces a strict priority structure so the AI always knows exactly what is most important.

```text
             ┌─────────────────────────────────────────────────────────┐
             │                      USER REQUEST                       │
             └────────────────────────────┬────────────────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │    TIER 0: ~/AGENTS.md (Bootstrap)    │
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │  TIER 1: ~/BRAIN/AGENTS.md (Mandates) │
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │  TIER 2: ~/.gemini/GEMINI.md (Global) │
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
        ┌─────────────────────────────────┴─────────────────────────────────┐
        ▼                                 ▼                                 ▼
┌──────────────┐                  ┌──────────────┐                  ┌──────────────┐
│    TIER 3    │                  │    TIER 4    │                  │    TIER 5    │
│    SITUATION │                  │  LIVE STATE  │                  │ AUTO-IMPROVE │
│    ~/INFO    │                  │ ~/BRAIN/tms  │                  │~/IMPROVEMENT │
└──────────────┘                  └──────────────┘                  └──────────────┘
        │                                 │                                 │
        └─────────────────────────────────┼─────────────────────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │  TIER 6: ~/BRAIN/learned-lessons/     │
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
             ┌─────────────────────────────────────────────────────────┐
             │              FULLY CONTEXTUALIZED AI AGENT              │
             └─────────────────────────────────────────────────────────┘
```

| Tier | File / Location | Purpose | Priority |
| :--- | :--- | :--- | :--- |
| **TIER 0** | `~/AGENTS.md` | **Master Bootstrap**: The absolute first file any agent must read. Activates the engine. | 🔴 **Highest** |
| **TIER 1** | `~/BRAIN/AGENTS.md` | **Project Mandates**: Session rules, meso memory rules, and local development standards. | 🟠 High |
| **TIER 2** | `~/.gemini/GEMINI.md` | **Machine Mandates**: Cross-project preferences, machine hardware profile, global security. | 🟡 Medium |
| **TIER 3** | `~/INFO/over-owner/SITUATIE_OVERZICHT.md` | **Owner Situation**: Central reference for personal context, legal/medical history, and targets. | 🟢 Reference |
| **TIER 4** | `~/BRAIN/tms/` + `~/BRAIN/policies/` | **Live State**: TMS task flow (todo / in-progress / done) and the machine-enforced guardrails. | 🟢 State |
| **TIER 5** | `~/IMPROVEMENT.md` | **Long-Term Auto-Improvement**: Feedback loop tracking what the agent learned during the session. | 🟢 Feedback |
| **TIER 6** | `~/BRAIN/learned-lessons/` | **Technical Lessons**: A highly curated directory of reusable coding/configuration patterns. | 🟢 Lessons |

> [!IMPORTANT]
> **The Routing Rule:** A piece of information MUST live in exactly one tier. If a conflict or duplicate arises, priority is determined from top to bottom (Global/Machine Rules supersede project templates, which supersede situational references).

> [!NOTE]
> **The Zone Model:** `~/BRAIN/` is exclusively the *technical* capsule (mandates, memory, TMS, hooks, policies) — it stays PII-free and portable. Personal content lives in dedicated root zones: `~/INFO/` (dossiers & knowledge base), `~/PLAN/` (plans) and `~/INBOX/` (the owner → agent drop-off channel: drop any PDF, letter or note there; the session-startup script reports the item count, and the agent processes every item to its owner location and empties the folder). Convenience access to single files from the root happens only via symlinks.

---

## 🛠️ Deep Feature Breakdown

### 🧠 1. Memanto Working Memory Engine (`brain/lib/`)
A sophisticated, 13-category temporal memory bank (`Instruction`, `Fact`, `Decision`, `Goal`, `Preference`, etc.) that features:
- **Exponential Confidence Decay**: Automatically reduces the confidence scores of transient situational facts over time while preserving stable, core facts.
- **AI-Powered Semantic Conflict Detection**: Scans proposed memory inserts against existing ones to catch and supersede contradictions automatically (compatible with Gemini 3.0 Thought Signatures).
- **Hybrid Search Recaller**: Batched cosine-similarity vector embeddings combined with Jaccard keyword overlap fallbacks.
- **Runs on a free API key**: uses a Google AI Studio key (`GEMINI_API_KEY` or `GOOGLE_API_KEY`, read from the environment or `~/.gemini/.env`) — the free tier is sufficient; no paid subscription required. Falls back to keyless Vertex AI (ADC) when a Google Cloud project is configured.

### 📊 2. MACCHA Storage Manager (`infrastructure/storage-manager.js`)
An advanced diagnostics utility specifically engineered to maintain system health on resource-limited systems (such as Chromebooks running Crostini):
- **Terminology Alignment**: Categorizes project directory state as either **💧 HYDRATED** (dependencies present) or **🌵 DORMANT** (dependencies pruned to free space).
- **Interactive Cleanup**: Clears cache stores (`pnpm`, `npm`), optimizes bloated `.git` databases via `git gc --prune=now`, and identifies massive unused files to reclaim space instantly.

### 🛡️ 3. Absolute Supply Chain & Safety Guards
MACCHA turns your workspace into an ironclad security zone, protecting users who aren't cybersecurity experts:
- **Supply Chain Cooldown**: Enforces a `minimum-release-age=7d` for all packages to safeguard against zero-day malware.
- **HITL (Human-in-the-Loop) Mandate**: Under no circumstances can an agent execute actions modifying real-world capital or sending emails without explicit manual confirmation.
- **Auto-Guard Scans**: Performs pre-install `pnpm audit` checks and prints immediate `Safety Report: GREEN/RED` flags.
- **Secrets Scan**: Detects leaked API keys, RSA private keys, or service JSONs before committing.

### 📌 4. Task Management System (TMS) Hygiene
Automatic, script-driven maintenance keeps your daily workspace organized without mental overhead:
- **TMS Integrity Hook**: Validates that all files modified in the workspace or committed via git are logged correctly under the TMS files (`todo.md`, `in-progress.md`, `done.md`).
- **Pruning Rotator**: Completed items flow through `done.md` and are archived quarterly into `~/BRAIN/archive/tms/<year>-Q<x>.md`, preventing context windows from bloating.
- **Rule Guard at Startup**: `session-startup` flags leftover `[x]` items, broken TMS symlinks and an overgrown `in-progress.md` (max ±10 active items), and triggers a throttled weekly sweep.

### 🗄️ 5. Encrypted Weekly Backup (`cli-tools/maccha-backup`)
Set-and-forget disaster recovery for the entire knowledge base:
- **AES-256 encrypted tar** of your personal zones (`INFO/ PLAN/ BRAIN/ …`) written to a mounted cloud drive, with rotated retention and an automatic decrypt-and-list integrity check. How many backups are kept is set by the `KEEP` variable at the top of `cli-tools/maccha-backup` — adjust to taste (e.g. `KEEP=1` keeps only the most recent, `KEEP=4` a month of weekly history).
- **Key stays local**: generated once into `~/.config/maccha/backup.key` (keep an off-device copy); plain restore instructions are written next to the backups — without the key.
- **Zero overhead**: triggered automatically (throttled, once per 7 days) by `session-startup`.

### 🧰 6. Bundled AI & Productivity Tools
MACCHA comes with a suite of pre-configured tools designed to extend your agent's capabilities beyond simple code editing:
- **Himalaya Email CLI (`~/.local/bin/himalaya`)**: An optional, safe terminal-based email client. The `setup.sh` script can automatically compile and configure this for you, allowing agents to draft emails (subject to the strict HITL rules before sending).
- **Google Drive Integration (`INFRA/mydrive-access-tool.js` & `INFRA/gdrive-markdown-uploader.js`)**: Bridge tools that allow your CLI agents to securely read and parse your Google Docs/Drive files, as well as automatically convert and upload local markdown documents to Google Drive.
- **AI Waterfall / Deep Research (`INFRA/run_deep_research.js`)**: A powerful asynchronous research script that agents can trigger to perform deep web scraping and analysis, dropping the results back into the workspace.

---

## 📂 Repository Directory Map

```text
real-agent-setup/
├── system-brain/                  # MACCHA templates (PII-free, ready to customize)
│   ├── AGENTS.md                  #   Root bootstrap — fill with your own context
│   ├── IMPROVEMENT.md             #   LTAIS auto-improvement loop
│   ├── ALIASES.md                 #   Your aliases and shortcuts
│   ├── todo.md                    #   Task tracker
│   ├── in-progress.md             #   Current work
│   └── done.md                    #   Accomplishments
├── brain/                         # Memory engine
│   ├── lib/memanto_engine.py      #   13-category working memory (Memanto)
│   └── README.md
├── cli-tools/                     # Shared CLI utilities (AI models, storage, cleanup)
├── infrastructure/                # Shared bridges and session maintenance scripts
├── learned-lessons/               # Runtime directory (populated locally, never pushed)
│   └── README.md
├── setup.sh                       # Install script for new machines
└── publish.sh                     # Publish local improvements back to repo
```
*(Note: Directories like `cli-tools` and `infrastructure` contain numerous specialized scripts for system maintenance, AI integrations, and daily workflows.)*

---

## 🚀 Quick Start Guide

### Prerequisites
- A Unix-like environment (Linux, MacOS, WSL, or ChromeOS Crostini).
- `git` and `bash` installed.
- An AI coding assistant capable of reading local files (Antigravity, OpenCode, Claude Code, Cursor, etc.).

### 1. Installation

To set up a new machine with the complete MACCHA scaffolding harness:

```bash
git clone --depth 1 git@github.com:KarelTestSpecial/real-agent-setup.git
cd real-agent-setup
bash setup.sh
```

> [!NOTE]
> **Safe Installation:** `setup.sh` is completely non-destructive. It carefully copies templates to your home folder without overwriting *any* of your existing files or configurations.

**What the setup script accomplishes:**
1. Installs all standard **CLI utilities** in `~/bin/` — including the `session-startup` and `session-closeout` lifecycle scripts.
2. Configures **Infrastructure Bridges** (storage manager, cloud-drive access, deep-research runner) in `~/INFRA/`.
3. Copies MACCHA **PII-free templates** (`AGENTS.md`, `IMPROVEMENT.md`, etc.) to your home folder `~/`.
4. Offers an optional interactive prompt to download, compile, and configure the local **Himalaya CLI** email client in `~/.local/bin/`.

### 2. Post-Installation Configuration

1. **Populate Your Context**: Open the generated `~/AGENTS.md` and define your personal constraints, rules, and technical preferences. 
2. **Add CLI Tools to PATH**: In your `~/.bash_aliases` (or `~/.zshrc`), ensure `~/bin` is included in your PATH:
   ```bash
   export PATH="$HOME/bin:$PATH"
   ```
3. **Boot Your Agent**: Launch Antigravity, OpenCode, or your preferred agent.

---

## 🧹 Uninstalling

Changed your mind, or just testing on a throwaway machine? `uninstall.sh` reverses `setup.sh` — **safely**. It removes a file only if it is still byte-for-byte identical to the repo copy (i.e. you never touched it). Anything you edited, and every personal data directory, is left completely alone.

```bash
cd ~/real-agent-setup
bash uninstall.sh            # DRY-RUN — lists what would be removed, deletes nothing
bash uninstall.sh --force    # asks y/N before deleting each pristine file
bash uninstall.sh --force --yes   # delete pristine files without prompting
```

> [!IMPORTANT]
> **Always dry-run first.** The default `bash uninstall.sh` (no flags) only *reports* — it never deletes. Read the list, then re-run with `--force` to act on it. With `--force` you are still asked to confirm every single file unless you add `--yes`.

> [!NOTE]
> **What it never removes:** your edited templates (`~/AGENTS.md`, `todo.md`, …), your memory store (`~/INFRA/agents-brain/data`), and your personal zones (`~/BRAIN`, `~/INFO`, `~/PLAN`, `~/learned-lessons`). These are reported as **kept** and must be deleted by hand if you truly want them gone. The optional Himalaya client (`~/.local/bin` + its PATH line) is also left for manual cleanup. Every run ends with an itemized report of exactly what was installed, removed, kept, and skipped.

---

## 🛡️ Maintainer Publishing Guide

To push local improvements, bug fixes, or performance refinements to the shared utilities back to the public repository:

```bash
cd ~/real-agent-setup
bash publish.sh           # Interactively copies, commits, and pushes
bash publish.sh --dry-run # Review changes before committing
```

> [!WARNING]
> `publish.sh` will **NEVER** copy your personal files (`~/AGENTS.md`, `~/BRAIN/`, `~/learned-lessons/`) to the repository. Your private data and re-integration context remain completely localized to your physical machine.

### 🔒 Local-only sanitization config (gitignored)

`publish.sh` copies your working scripts verbatim, so a few personal details can ride along (a home-folder name, a one-off local tool). To keep those out of the public repo **without ever writing them into the committed `publish.sh` itself**, the publish step is driven by three optional, **gitignored** config files in the repo root. They live only on your machine; if a file is absent, that step is simply skipped.

| File | Purpose | Example line |
|---|---|---|
| `.publish-skip` | Filenames/globs to exclude from publishing entirely (one per line, `#` comments, globs allowed). | `my-personal-tool.js` |
| `.publish-sanitize.sed` | `sed` rewrite rules applied to every copied file — turn personal tokens into the public `*-owner` standard. | `s#over-myname#over-owner#g` |
| `.publish-pii-words` | Wordlist for the **hard PII gate**: if any of these words (or a hardcoded `/home/<user>/` path) survives into the synced content, the publish **aborts before committing**. | `myname` |

In addition, you can wrap any personal, non-generic block inside an otherwise-shared script with markers — `publish.sh` strips everything between them on sync:

```bash
# >>> LOCAL-ONLY
...personal block kept locally, never published...
# <<< LOCAL-ONLY
```

> [!NOTE]
> These three files are listed in `.gitignore`, so they are never tracked or pushed. Create them from scratch on each machine you publish from. New contributors adopting the framework simply add their own.

---

*MACCHA v2.0 | Multi-Agent Continuous Context Harness*  
*"Continuity is the absolute key to agentic performance."*
