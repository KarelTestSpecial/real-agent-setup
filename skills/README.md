# Digital Skills

Drop-in agent skills: plain `SKILL.md` files with YAML frontmatter, understood by
Claude Code, OpenCode, Antigravity and any other harness that reads a skills directory.

Each subdirectory is one skill. Install one by copying the folder into your agent's
skills directory (`~/.agents/skills/`, `~/.claude/skills/`, …); `setup.sh` does that
for you when installing on a new machine, and never overwrites a skill you already
have.

## Curation policy — hand-maintained, deliberately static

This directory is maintained **directly in this repository**, in the same spirit as
the `system-brain/` templates. What you see here is the published, generic version of
each skill, and it changes only when its maintainer decides to update it. Nothing is
auto-synced from anyone's local setup.

Two things follow from that:

- **A local skill is a different artefact, not a hidden source.** The maintainer's
  personal variants are written in Dutch and address their owner by name. They must
  not ship, and the language and PII gates would abort the publish if they tried. A
  skill here is a translation/derivative that may lag its local counterpart on
  purpose — exactly like a translated manual.
- **Editing here is the workflow.** Want a change published? Change the file in this
  repository and commit. There is no `publish.sh` wiring for skills on purpose: that
  script syncs CLI tools and infrastructure scripts (identical artefacts), never
  curated text.

## Bundled skills

| Skill | What it does |
| :--- | :--- |
| `step-by-step` | Patient, one-step-at-a-time guidance: exactly one step per message, always restarting at step 1, and the user keeps the reins on anything that changes. |
