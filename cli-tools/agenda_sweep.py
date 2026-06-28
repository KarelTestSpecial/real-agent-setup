#!/usr/bin/env python3
"""agenda_sweep.py — EXHAUSTIEVE 'vandaag/deze week'-agenda-sweep.

Codewoord-trigger: "DEZE WEEK".

Doel: nooit meer een hele bron overslaan. Het script sweept MECHANISCH élke
agenda-bron en bundelt alles in één overzicht. Volledigheid is gegarandeerd
door constructie:
  * de 3 TMS-fileen (todo.md, in-progress.md, shortlist.md), en
  * EVERY stakeholder overview via glob INFO/owner/**/00_*.md
    (stakeholder_1, stakeholder_2, platform_X, and any future 00_*.md automatically).

Output (INFO/owner/deze_week.md + stdout):
  - ⏰ Komende datums (vandaag .. +14 dagen) uit alle bronnen
  - 📋 TMS — open taken per file
  - 🤝 Stakeholder-overzichten — actie-essentie per 00_*.md
  - voettekst "Bronnen gesweept: …" als volledigheids-bewijs
Files met een afwijkend formaat krijgen de vlag [FORMAAT AFWIJKEND →
volledig openen] zodat ze nooit stil wegvallen.

AFGELEIDE WEERGAVE (CLAUDE.md regel 1.b): wijzig taken in hun eigen bron,
not hier; draai dit script opnieuw.
"""
import re
import sys
import datetime
from pathlib import Path

HOME = Path.home()
TMS = HOME / "BRAIN" / "tms"
TMS_FILES = [
    (TMS / "todo.md", "todo.md — alle open taken"),
    (TMS / "in-progress.md", "in-progress.md — nu actief"),
    (TMS / "shortlist.md", "shortlist.md — jouw prioriteiten"),
]
STAKEHOLDER_ROOT = HOME / "INFO" / "owner"
OUT = STAKEHOLDER_ROOT / "deze_week.md"
WINDOW_DAYS = 14

MONTHS = {
    "januari": 1, "februari": 2, "maart": 3, "april": 4, "mei": 5, "juni": 6,
    "juli": 7, "augustus": 8, "september": 9, "oktober": 10, "november": 11,
    "december": 12,
}
RE_DATE_WORD = re.compile(r"\b(\d{1,2})\s+(" + "|".join(MONTHS) + r")\b", re.I)
RE_DATE_NUM = re.compile(r"\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b")
RE_CHECK_OPEN = re.compile(r"^\s*- \[[ /]\]\s*(.*)$")
RE_TIER = re.compile(r"^\[(Ephemeral|Sprint|Strategic|Eternal)\]\s*")
RE_LINK = re.compile(r"\[([^\]]+)\]\([^)]*\)")
RE_URL = re.compile(r"https?://\S+|file://\S+")
RE_SNELLE = re.compile(r"^##\s.*snelle\s+status", re.I)
RE_H2 = re.compile(r"^##\s")
RE_TITLE = re.compile(r"^#\s+(.*)$")

WEEKDAYS = {"maandag": 0, "dinsdag": 1, "woensdag": 2, "donderdag": 3,
            "vrijdag": 4, "zaterdag": 5, "zondag": 6}
RE_RECUR = re.compile(r"\b(elke|weekly|maandelijks|terugkerend)", re.I)
RE_ROND_DE = re.compile(r"rond de (\d{1,2})e", re.I)


def clean(text: str, limit: int = 200) -> str:
    text = RE_LINK.sub(r"\1", text)
    text = RE_URL.sub("", text)
    text = text.replace("**", "").replace("`", "")
    text = re.sub(r"\s+", " ", text).strip(" ;–-:")
    if len(text) > limit:
        text = text[:limit].rsplit(" ", 1)[0] + "…"
    return text.strip()


def parse_recurring(line, today, horizon):
    """Zet terugkerende patronen om naar concrete datums in [today, horizon].
    Vangt 'elke week op zaterdag' (weekdag) en 'maandelijks rond de Ne'."""
    if not RE_RECUR.search(line):
        return []
    out, low = [], line.lower()
    for name, wd in WEEKDAYS.items():
        if re.search(r"\b" + name + r"\b", low):
            d = today
            while d <= horizon:
                if d.weekday() == wd:
                    out.append(d)
                d += datetime.timedelta(days=1)
    for m in RE_ROND_DE.finditer(line):
        day = int(m.group(1))
        months = [(today.year, today.month)]
        months.append((today.year + 1, 1) if today.month == 12
                      else (today.year, today.month + 1))
        for yr, mo in months:
            try:
                d = datetime.date(yr, mo, day)
            except ValueError:
                continue
            if today <= d <= horizon:
                out.append(d)
    return out


def parse_dates(line, today, horizon):
    """Geef alle (date, kort-label) uit een regel die in [today, horizon] valt."""
    hits = []
    for m in RE_DATE_WORD.finditer(line):
        day, mon = int(m.group(1)), MONTHS[m.group(2).lower()]
        hits.append((day, mon, None))
    for m in RE_DATE_NUM.finditer(line):
        day, mon = int(m.group(1)), int(m.group(2))
        yr = m.group(3)
        if 1 <= day <= 31 and 1 <= mon <= 12:
            hits.append((day, mon, int(yr) if yr else None))
    out = []
    for day, mon, yr in hits:
        for year in ([yr] if yr else [today.year, today.year + 1]):
            if yr and yr < 100:
                year = 2000 + yr
            try:
                d = datetime.date(year if not yr else (2000 + yr if yr < 100 else yr),
                                  mon, day)
            except ValueError:
                continue
            if today <= d <= horizon:
                out.append(d)
                break
    return out


def open_tasks(path):
    rows = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        m = RE_CHECK_OPEN.match(raw)
        if not m:
            continue
        body = m.group(1).strip()
        urgent = "🔥" in body
        body = RE_TIER.sub("", body).replace("🔥", "").strip()
        indent = "  ↳ " if raw[:1] in (" ", "\t") and raw.lstrip() != raw else ""
        rows.append(("🔥 " if urgent else "") + indent + clean(body))
    return rows


def stakeholder_essence(path):
    """Beste-inspanning actie-essentie + vlag bij afwijkend formaat."""
    lines = path.read_text(encoding="utf-8").splitlines()
    title = next((RE_TITLE.match(l).group(1) for l in lines if RE_TITLE.match(l)),
                 path.name)
    block, arrows, checks = [], [], []
    # 1) "Snelle status"-blok (de gecureerde at-a-glance agenda)
    for i, l in enumerate(lines):
        if RE_SNELLE.match(l):
            for nxt in lines[i + 1:]:
                if nxt.strip() == "---" or RE_H2.match(nxt):
                    break
                if nxt.strip():
                    block.append(nxt.rstrip())
            break
    # 2) expliciete actieregels door het hele file
    for l in lines:
        if "→ Met" in l:
            arrows.append(clean(l))
        elif RE_CHECK_OPEN.match(l):
            checks.append(clean(RE_CHECK_OPEN.match(l).group(1)))
    flagged = not (block or arrows or checks)
    fallback = []
    if flagged:
        for l in lines:
            if re.match(r"^\s*([*-]|\d+\.|\*\*\d+\.)\s", l):
                fallback.append(clean(l))
    return {
        "title": clean(title), "block": block, "arrows": arrows,
        "checks": checks, "flagged": flagged, "fallback": fallback[:30],
    }


def build():
    today = datetime.date.today()
    horizon = today + datetime.timedelta(days=WINDOW_DAYS)
    swept, date_hits = [], []
    out = []
    out.append("# 🗓️ Deze week — volledige agenda-sweep\n")
    out.append(
        f"> *Automatisch gegenereerd op {datetime.datetime.now():%Y-%m-%d %H:%M} "
        "door `~/bin/agenda_sweep.py` (codewoord: \"DEZE WEEK\"). Sweept ALLE "
        "agenda sources: 3 TMS files + every `INFO/owner/**/00_*.md`. "
        "NOT handmatig bewerken — wijzig in de bron, draai opnieuw.*\n")

    # --- TMS ---
    tms_blocks = []
    for path, label in TMS_FILES:
        if not path.exists():
            continue
        swept.append(path.name)
        tasks = open_tasks(path)
        for raw in path.read_text(encoding="utf-8").splitlines():
            for d in parse_dates(raw, today, horizon):
                date_hits.append((d, clean(raw, 120)))
            for d in parse_recurring(raw, today, horizon):
                date_hits.append((d, clean(raw, 120)))
        tms_blocks.append((label, tasks))

    # --- Stakeholder 00_*.md ---
    stake = []
    for path in sorted(STAKEHOLDER_ROOT.rglob("00_*.md")):
        if path.name.lower().startswith("00_index"):
            continue  # mappenindex, no stakeholder-overzicht
        swept.append(str(path.relative_to(STAKEHOLDER_ROOT)))
        ess = stakeholder_essence(path)
        for raw in path.read_text(encoding="utf-8").splitlines():
            for d in parse_dates(raw, today, horizon):
                date_hits.append((d, clean(raw, 120)))
            for d in parse_recurring(raw, today, horizon):
                date_hits.append((d, clean(raw, 120)))
        stake.append((path, ess))

    # --- ⏰ Datums ---
    out.append(f"\n## ⏰ Komende datums (vandaag {today:%d/%m} .. +{WINDOW_DAYS}d)\n")
    seen = set()
    uniq = []
    for d, txt in sorted(date_hits):
        key = (d, txt[:60])
        if key in seen:
            continue
        seen.add(key)
        uniq.append((d, txt))
    if uniq:
        for d, txt in uniq:
            out.append(f"- **{d:%a %d/%m}** — {txt}")
    else:
        out.append("*(no expliciete datums in de bronnen voor dit venster)*")

    # --- 📋 TMS ---
    out.append("\n## 📋 TMS — open taken\n")
    for label, tasks in tms_blocks:
        out.append(f"\n### {label}\n")
        out.extend(f"- {t}" for t in tasks) if tasks else out.append("*(leeg)*")

    # --- 🤝 Stakeholders ---
    out.append("\n## 🤝 Stakeholder-overzichten\n")
    for path, ess in stake:
        out.append(f"\n### {ess['title']}  ·  `{path.relative_to(STAKEHOLDER_ROOT)}`\n")
        if ess["flagged"]:
            out.append("> ⚠️ **[FORMAAT AFWIJKEND → volledig openen]** — no "
                       "snelle-status/actieregels found; ruwe lijstregels:")
            out.extend(f"- {t}" for t in ess["fallback"])
        else:
            if ess["block"]:
                out.append("**Snelle status:**")
                out.extend(ess["block"])
            if ess["arrows"]:
                out.append("\n**Actiepunten (→ Met):**")
                out.extend(f"- {a}" for a in ess["arrows"])
            if ess["checks"]:
                out.append("\n**Open checkboxes:**")
                out.extend(f"- {c}" for c in ess["checks"])

    # --- voettekst: volledigheids-bewijs ---
    out.append("\n---\n")
    out.append(f"**Bronnen gesweept ({len(swept)}):** " + " · ".join(swept))
    out.append("")
    return "\n".join(out)


def main():
    text = build()
    if "--stdout" in sys.argv:
        print(text)
        return
    OUT.write_text(text, encoding="utf-8")
    print(text)
    print(f"\n[geschreven: {OUT}]", file=sys.stderr)


if __name__ == "__main__":
    main()
