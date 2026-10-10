# 🗂️ TMS Maintenance

The Task Management System (TMS) is three plain markdown files in `~/BRAIN/tms/`:

| File | Holds | Cap |
|---|---|---|
| `todo.md` | everything not yet started, plus items waiting on an external party | — |
| `in-progress.md` | only what is actively being worked on | ~10 open items |
| `done.md` | completed items, one line each | pruned at 100 lines |

## Flow rules

1. **One owner per task.** Every task lives in exactly one of the three files.
2. **Done is immediate.** A finished task moves to `done.md` at once as a single
   line (date + 2–3 sentences + artifact link). Never leave `- [x]` sitting in
   `todo.md` or `in-progress.md`.
3. **Waiting is not working.** An item blocked on an external party belongs in
   `todo.md`, not `in-progress.md`.
4. **Fixed line form:**

   ```
   - [ ] [Tier] 🔥 **Title**: description … (date) [link]
   ```

   The tier label (`[Ephemeral]` / `[Sprint]` / `[Strategic]` / `[Eternal]`)
   always sits directly after the checkbox; the 🔥 marker is optional.

## What startup checks

`~/bin/maccha/session-startup` warns on:

- a missing `todo.md` / `in-progress.md` (usually a broken root symlink),
- leftover `- [x]` items in `todo.md` / `in-progress.md`,
- more than ~10 open items in `in-progress.md`.

It also runs the **throttled weekly sweep** (once per 7 days): `tms_prune.js`
plus a Memanto working-memory prune, followed by the manual steps below.

## Weekly sweep (manual part)

1. Move every `- [x]` item from `todo.md` / `in-progress.md` to `done.md`.
2. Remove duplicates.
3. Trim `in-progress.md` back to ~10 items.
4. Enforce the label format.

## Pruning and the archive

`~/INFRA/maintenance/tms_prune.js` runs at both startup and closeout. When
`done.md` grows past **100 lines**, it rotates the **oldest** lines into
`~/BRAIN/archive/tms/<year>-Q<x>.md`.

> [!NOTE]
> Keep the direction straight: the *oldest* completed lines rotate out, never the
> newest. Getting this backwards archives the freshest history and is easy to
> miss in review.

## Guardrails

`~/BRAIN/policies/guardrails.md` is the register of **machine-enforced** rules.
Each rule is a `## Guardrail:` block with `- key: value` lines; the data stays
with its owner (a guardrail *references* the source file, it never copies it).

- Supported type today: `verboden-termen-in-actieve-tms` — bold terms from a
  given section of a source file may not appear in the active TMS.
- Disable a rule with `- actief: nee`, or delete the block. No hook code change.
- Add a guardrail by adding a block — never by hardcoding it in the hook.

`check_guardrails()` in the integrity hook evaluates the register at every
closeout.

## Archive retention

`~/BRAIN/archive/README.md` owns the retention policy: canonical documents and
quarterly TMS files are **permanent**, everything else ages out after **6 months**,
and the whole archive has a **5 MB** ceiling. `check_archive_retention()` signals
violations but **never blocks**; clearing is always a human decision (HITL).

## The integrity hook

`~/bin/maccha/tms_integrity_hook.py` is the machine guard. It runs at closeout
and checks, in order:

1. recent git commits are registered in the TMS,
2. recent workspace activity is registered,
3. learned lessons carry valid frontmatter,
4. every lesson appears in its category index,
5. guardrails hold,
6. archive retention is respected,
7. the mandate context budget is met,
8. published tooling is not drifting from the repo.

A clean run prints `🟢 TMS is CLEAN AND UPTODATE` and exits 0.
