# Digital Skills

Drop-in agent skills: plain `SKILL.md` files with YAML frontmatter, understood by
Claude Code, OpenCode, Antigravity and any other harness that reads a skills directory.

Each subdirectory is one skill. Install one by copying the folder into your agent's
skills directory (`~/.agents/skills/`, `~/.claude/skills/`, …); `setup.sh` does that
for you when installing on a new machine.

## Curation policy — mirrored per skill, never wholesale

This directory is generated from the maintainer's `~/BRAIN/skills/` by `publish.sh`,
in the same way as `cli-tools/`: the local directory is the source of truth.

Two things follow from that:

- **Curation is per skill.** `~/BRAIN/skills/` also holds personal variants that are
  written in Dutch and address their owner by name. They must not ship, and the
  language and PII gates would abort the publish if they tried. So every public skill
  needs *both* a line in `.publish-allowlist` and a copy call in the mirrors section
  of `publish.sh`. One without the other is a no-op, not a leak: an allowlisted file
  still has to be copied, and a Dutch file that makes it through is caught by the gate.
- **Never edit the files here by hand.** Change `~/BRAIN/skills/<skill>/SKILL.md` and
  run `publish.sh`. A skill may exist locally that is deliberately *not* published
  here — that is the default, not an oversight.

## Bundled skills

| Skill | What it does |
| :--- | :--- |
| `step-by-step` | Patient, one-step-at-a-time guidance: exactly one step per message, always restarting at step 1, and the user keeps the reins on anything that changes. |
