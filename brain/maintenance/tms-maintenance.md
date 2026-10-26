# 🗂️ TMS Maintenance

The Task Management System (TMS) is four plain markdown files in `~/BRAIN/tms/`:

| File | Holds | Cap |
|---|---|---|
| `todo.md` | active tasks (horizon ≤ 30 days) + items waiting on an external party | ≤ 100 lines, ≤ 300 chars/line |
| `in-progress.md` | only what is actively being worked on right now | ~10 open items, ≤ 300 chars/line |
| `backlog.md` | parked, paused, or long-term (> 30 days) tasks — **not** loaded at `start` | ≤ 300 chars/line |
| `done.md` | completed items, one line each | pruned at 100 lines |

## Flow rules

1. **One owner per task.** Every task lives in exactly one of the four files.
2. **Done is immediate.** A finished task moves to `done.md` at once as a single
   line (date + 2–3 sentences + artifact link). Never leave `- [x]` sitting in
   `todo.md`, `in-progress.md`, or `backlog.md`.
3. **Waiting is not working; parked is not active.** An item blocked on an
   external party within the next 30 days belongs in `todo.md` (not
   `in-progress.md`). Parked projects and horizons > 30 days belong in
   `backlog.md` so `todo.md` stays compact for every session start.
4. **Fixed line form (≤ 300 chars per line):**

   ```
   - [ ] [Tier] 🔥 **Title**: next action … (date) [link]
   ```

   Keep only the next action and a link to the owner dossier (`INFO/` or
   `PLAN/`); chronological history belongs in the dossier, never in the task
   line. The tier label (`[Ephemeral]` ≤7d / `[Sprint]` ≤21d / `[Strategic]`
   quarter / `[Eternal]`) always sits directly after the checkbox; 🔥 is
   optional.

## What startup checks

`~/bin/maccha/session-startup` warns on:

- a missing `todo.md` / `in-progress.md` (usually a broken root symlink),
- leftover `- [x]` items in `todo.md` / `in-progress.md`,
- more than ~10 open items in `in-progress.md`,
- any line in `todo.md`, `in-progress.md`, or `backlog.md` exceeding the
  character limit in `~/.config/maccha/tms_line_limit.json` (default: **300 chars**).

It also runs the **throttled weekly sweep** (once per 7 days): `tms_prune.js`
plus a Memanto working-memory prune, followed by the manual steps below.

## Weekly sweep & expiry audit

`~/INFRA/maintenance/tms_prune.js` runs at both weekly sweep and closeout:

1. **Active TMS hygiene & expiry check (`auditActiveTms`)**: warns on leftover
   `- [x]` items, warns if `todo.md` exceeds 100 lines, and flags `[Ephemeral]`
   items older than **7 days** or `[Sprint]` items older than **21 days** based
   on their `(dd/mm)` / `(dd Month yyyy)` date marker so stale items move to
   `done.md` or `backlog.md`.
2. **Archive rotation (`pruneDone`)**: when `done.md` grows past **100 lines**,
   it rotates the **oldest** lines into `~/BRAIN/archive/tms/<year>-Q<x>.md`.

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
3. all lines in `todo.md`, `in-progress.md`, and `backlog.md` are ≤ 300 chars,
4. learned lessons carry valid frontmatter,
5. every lesson appears in its category index,
6. guardrails hold,
7. archive retention is respected,
8. the mandate context budget is met,
9. published tooling is not drifting from the repo.

A clean run prints `🟢 TMS is CLEAN AND UPTODATE` and exits 0.
