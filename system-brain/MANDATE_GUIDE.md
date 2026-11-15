# MANDATE_GUIDE — how this brain is built

Read this once, at install time. It is **not** a session mandate: `AGENTS.md`
carries the operative rules that every session loads, this file explains *why*
they are shaped that way. Keeping the reasoning here is what allows the mandate
file to stay short enough to load every session without wasting context.

---

## Layer structure

```
[TIER 0 — TOP]  ~/AGENTS.md                        ← entry point; a symlink to BRAIN/AGENTS.md, not a second document
[TIER 1]        ~/BRAIN/AGENTS.md                  ← THIS FILE — mandates & session protocol
[TIER 2]        ~/.gemini/GEMINI.md                ← machine mandates & tooling rules
[TIER 3]        ~/INFO/over-owner/SITUATIE_OVERZICHT.md  ← owner situation (mandatory)
[TIER 4]        ~/BRAIN/tms/ + ~/BRAIN/policies/   ← live state: TMS task flow + guardrails register
[TIER 5]        ~/IMPROVEMENT.md                   ← LTAIS (long-term auto-improvement)
[TIER 6]        ~/BRAIN/learned-lessons/           ← curated lessons (technical / strategic / security)
```

**Routing rule:** a fact lives in exactly one layer. Priority: Tier 0 > Tier 1 > Tier 2.

Tier 0 is an alias, not a document. `setup.sh` installs the template as
`~/BRAIN/AGENTS.md` and points `~/AGENTS.md` at it with a symlink. Two copies of
the same mandate drift apart, and the tier map above promises a file that used to
be never created.

---

## Working memory is a find layer, not a fact store

Memanto (`~/BRAIN/memanto/`) has three jobs:

1. **Session history** — one `Event` at closeout.
2. **Behaviour** — `Instruction`/`Preference`/`Decision`/`Goal`, which have no other owner file.
3. **References** — one line saying *where* something lives.

Anything that already has an owner file (amounts, addresses, links, appointments,
statuses — see Knowledge Maintenance) must **not** be copied in. A second copy
drifts; `Fact`/`Instruction` entries decay towards prune; and recall is *fuzzy*
where a dossier is exact.

---

## Owner first — the full reasoning

The test: *"If this changes, which file must change with it?"*

- That file exists → write it **there**, with at most one reference in Memanto.
- It does not exist → Memanto is the owner.
- **Never a second copy.** Say *where* it landed, not what you stored.
- In doubt, name the candidates — dossier, mandate file, or memory layer — and ask; never choose silently.
- When the owner says *"put this in your memory"*, read it as *"make sure this stays findable"*.

### Why one codeword, defined once

A single word beats a glossary of phrasings, because every phrasing is another
chance to drift. Three design rules follow:

- **Name the outcome, not the store.** A codeword meaning *"save it"* or *"remember it"* points an agent at a memory layer — exactly what this rule forbids. One meaning *"this must persist"* forces it to ask *where* the fact belongs.
- **Self-contained, never "as above".** State the criterion in full where the codeword is defined. An agent may load one heading with its paragraph and nothing else, so *"apply the test above"* breaks the moment the block moves.
- **Never park the procedure in a per-agent slash command.** Those live under a different path and in a different format in every harness (OpenCode `~/.config/opencode/command/`, Claude Code `~/.claude/commands/`, Gemini CLI TOML). One codeword would need one copy per harness — the duplication this rule exists to prevent. The mandate file is the only layer every agent reads.

---

## Zone model (home directory)

- `~/BRAIN/` — exclusively the *technical* MACCHA capsule (mandates, memory, TMS, hooks, policies, system-info, archive).
- `~/INFO/` — dossiers and the knowledge base (personal content).
- `~/PLAN/` — plans.
- `~/INBOX/` — owner → agent drop-off channel. Items are triaged with a proposal; instruction-type items are NEVER executed without explicit owner confirmation (HITL per item); pure archival material flows straight to its owner location, then the folder is emptied.
- `~/workspace/` — code. `~/scratch/` — temporary files.
- Convenience access to single files from the root only via symlinks.

Every scaffolding change must keep the `BRAIN/` capsule simple and PII-free to
copy into the public `real-agent-setup` repo.

---

## MACCHA as a package (real-agent-setup)

- **Every change** to the harness structure must be reflected in the repo via `publish.sh`.
- **Portability:** scripts always use `$HOME` or `os.homedir()` — never hardcoded paths.
- **PII gate:** `AGENTS.md`, `IMPROVEMENT.md`, `BRAIN/*` and learned lessons are private; only sanitized templates/lessons are published.

---

## Key locations

| What | Where |
|---|---|
| Task flow (TMS) | `~/BRAIN/tms/` (symlinks: `~/todo.md`, `~/in-progress.md`, `~/backlog.md`, `~/done.md`) |
| Working memory | `~/BRAIN/memanto/memanto_global.json` (via `memanto_cli.py remember/recall/answer/distill/prune`) |
| Tool register | `~/BRAIN/system-info/TOOL_REGISTER.md` |
| Infrastructure scripts | `~/bin/maccha/` and `~/INFRA/` |
| Encrypted weekly backup | `maccha-backup` — AES-256 tar of the personal zones + `~/bin/maccha` → cloud drive (key `~/.config/maccha/backup.key`); weekly via `session-startup` |