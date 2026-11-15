# Learned Lessons

Curated, reusable lessons: one file per lesson, grouped in **domain files**, with
`ROUTER.md` as the map. `ROUTER.md` says *when* to open which domain file; the
domain file lists the lessons; the lesson file holds the content.

This is a starter set. Your agent adds to it after each session — one line in the
domain file plus the lesson itself, never a second copy elsewhere.

## Layout

```
learned-lessons/
  ROUTER.md                 ← start here: domain → "use it when"
  technical/
    <domain>.md             ← one file per domain: the lesson list
    <lesson>.md             ← one file per lesson, with frontmatter
  security/
    ...
```

A lesson file carries frontmatter (`category`, `domain`, `tier`, `last_updated`).
`domain:` must match the domain file that lists it.

## Categories

- `technical/` — code patterns, tool usage, debugging breakthroughs
- `strategic/` — market insights, positioning, opportunity analysis
- `security/` — trap patterns, honeypot signatures, supply chain risks
- `archive/` — historical lessons (rotated for bloat control)