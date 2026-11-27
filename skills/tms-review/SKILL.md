---
name: tms-review
description: Procedure to walk every problematic TMS line one-by-one together with the user and resolve it (HITL). Use for "TMS hygiene", "review the TMS lines", "clean up the todo", "one at a time", or whenever the tms-review-queue tool prints a queue. Per line: present -> the user decides (extend / split / de-tier / park->backlog / close->done / drop the flame / delete) -> apply. Never automatic.
---

# TMS review — one-at-a-time walkthrough (HITL)

The TMS silently piles up problematic lines (expired Sprint items, 🔥-inflation,
wrong tier, duplicate owners). This procedure walks them **together with the user**,
one line per message, with an explicit decision per line.

## The golden-margin rule

**Never a batch of decisions.** Present one line, wait for the choice, then apply and
move to the next. If the user says "slow down", drop to exactly one step per message.

## Step 1 — generate the queue

Run the `tms-review-queue` tool (in `infrastructure/maintenance/`):

```bash
node infrastructure/maintenance/tms-review-queue.js
```

It scans `todo.md` + `in-progress.md` + `backlog.md` and groups per badge (heaviest
first). It **never acts** — it only prints. Flags: `--json`, `--today=DD/MM/YYYY`
(testing), `--no-backlog`.

## Step 2 — badge semantics (what each category means)

| Badge | Meaning | Typical decision |
|---|---|---|
| 🔴 OVERDUE-HARD | deadline < today | urgent: do now / reschedule |
| 🟠 OVERDUE-TIER | created > tier-window (Sprint 21d, Strategic 90d, Ephemeral 7d) | extend (refresh date) or de-tier / park |
| 🟣 MISPLACED | tier does not belong in this file (e.g. Sprint/Strategic >30d in todo, or Ephemeral/Sprint in backlog) | park->backlog / close->done / de-tier |
| 🟡 NEAR | >70% of tier-window, or deadline ≤14d | extend or a concrete action |
| 🔵 FIRE | lone 🔥 without deadline & >21d (in todo), or 🔥 in backlog (fire does not belong with parked items) | drop the flame or reclassify |
| ⚪ DUP-TITLE | same title on several open lines | merge / one owner |
| 🟢 OK | no problem | (leave as is) |

**Note — backlog = parked.** Tier-age-decay does NOT apply there (a parked item *is*
old). Backlog items are only checked for wrong tier, dead deadline, duplicate and 🔥.

## Step 3 — decision options (the user chooses per line)

- **extend** — refresh the `(DD/MM)` date to today (still current, deadline holds).
- **split** — too big/broad for one line -> split into concrete sub-actions.
- **de-tier** — e.g. [Sprint] -> [Strategic] (less urgent) or [Ephemeral] -> [Sprint].
- **park->backlog** — no action for >30d -> move to `backlog.md`.
- **close->done** — finished / no longer valuable -> `done.md` (or delete if noise).
- **drop the flame** — remove 🔥 (fire = now-action; drop it if it is not a now-action).
- **delete** — line is outdated/duplicate; the owner lives elsewhere (e.g. a dossier overview or another TMS line).

**Important != urgent.** An [Eternal] or [Strategic] item can be very important without
a 🔥. The flame means "now", not "important". If the user hesitates about a 🔥 on
something important: explain the difference, but their importance argument wins for
keeping it — only the *symbol* is up for debate.

## Step 4 — apply (always only AFTER the choice)

- Extend: `(DD/MM)` -> today's date.
- De-tier: `[Sprint]` -> `[Strategic]`, etc.
- Park: move the line to `backlog.md` (same shape).
- Close/delete: remove from `todo.md`/`backlog.md`; never leave a `[x]` behind.
- Symbol: drop `🔥 `.

After each change the integrity hook validates ≤360 chars + tier correctness.

## Step 5 — summarise at the end

Give a short table: line -> decision -> applied. Point to the owner dossiers for the
chronology (that does NOT belong in the TMS line itself).

## What you do NOT do

- Never extend/delete a line without the user's approval (HITL).
- Never leave a `[x]`; never stuff chronology into the line.
- Never ignore the queue because "it looks fine" — the user decides, even when in doubt.
- Never explain 🔥 as "important"; 🔥 = "now".

## Related tools

- `tms-review-queue.js` — the queue itself (HITL, never auto).
- `tms-expiry-review.js` — narrower per-item expiry check (runs in session-startup).
- `tms_integrity_hook.py` — validation (≤360 chars, tier, guardrails).