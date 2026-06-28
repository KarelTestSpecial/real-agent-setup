#!/usr/bin/env python3
"""tms_human_view.py — genereert een mensvriendelijke tabel uit todo.md.

AFGELEIDE WEERGAVE (CLAUDE.md regel 1.b: één feit, één eigenaar).
Bron = BRAIN/tms/todo.md. Output mag NOOIT handmatig bewerkt worden;
wijzig taken altijd in todo.md en draai dit script opnieuw.

Usage: tms_human_view.py            -> writes to standard output path
          tms_human_view.py --stdout   -> print naar scherm
"""
import re
import sys
import datetime
from pathlib import Path

HOME = Path.home()
SRC = HOME / "BRAIN" / "tms" / "todo.md"
OUT = HOME / "INFO" / "owner" / "todo_overzicht.md"

STATUS = {" ": "⬜ Open", "/": "🔄 In progress", "x": "✅ Done"}

# Vriendelijkere sectienamen in de uitvoer.
SECTION_RENAME = {"Cron Jobs": "Terugkerend"}

CHECKBOX = re.compile(r"^(\s*)- \[([ /x])\]\s*(.*)$")
SECTION = re.compile(r"^##\s+(.*)$")
TIER = re.compile(r"^\[(Ephemeral|Sprint|Strategic|Eternal)\]\s*")
LINK = re.compile(r"\[([^\]]+)\]\([^)]*\)")        # [tekst](url) -> tekst
BARE_FILE = re.compile(r"\(?file://\S+\)?")         # losse file:// paden
BARE_URL = re.compile(r"https?://\S+")
BOLD = re.compile(r"\*\*(.+?)\*\*")


def clean_emoji_headers(s: str) -> str:
    # Remove leidende emoji/iconen + achterliggend tier-label uit sectietitels.
    s = re.sub(r"\s*\[(Ephemeral|Sprint|Strategic|Eternal)\]\s*$", "", s)
    return re.sub(r"^[\W_]*\b", "", s).strip() or s.strip()


def strip_tech(text: str) -> str:
    text = LINK.sub(r"\1", text)
    text = BARE_FILE.sub("", text)
    text = BARE_URL.sub("", text)
    text = text.replace("**", "").replace("`", "")
    text = re.sub(r"\s+", " ", text).strip(" ;–-")
    return text.strip()


def split_title_desc(body: str):
    """Haal titel + korte toelichting uit de ruwe item-tekst."""
    body = body.strip()
    m = BOLD.search(body)
    if m:
        title = m.group(1).strip()
        rest = body[m.end():].lstrip(" :—-")
    else:
        # No bold: titel = stuk vóór eerste scheidingsteken.
        m2 = re.split(r"\s[—:]\s|\s-\s|:\s", body, maxsplit=1)
        title = m2[0].strip()
        rest = m2[1].strip() if len(m2) > 1 else ""
    return strip_tech(title).rstrip(":"), strip_tech(rest)


def shorten(s: str, limit: int = 150) -> str:
    if len(s) <= limit:
        return s
    cut = s[:limit].rsplit(" ", 1)[0]
    return cut + "…"


def parse(lines):
    rows = []
    section = "Overig"
    for line in lines:
        sm = SECTION.match(line)
        if sm:
            section = clean_emoji_headers(sm.group(1))
            section = SECTION_RENAME.get(section, section)
            continue
        cm = CHECKBOX.match(line)
        if not cm:
            continue
        indent, state, body = cm.group(1), cm.group(2), cm.group(3)
        # Tier-label en urgentievlam eruit halen.
        body = TIER.sub("", body)
        urgent = "🔥" in body
        body = body.replace("🔥", "").strip()
        title, desc = split_title_desc(body)
        if indent:  # subtaak
            title = "↳ " + title
        rows.append({
            "section": section,
            "title": shorten(title, 80),
            "urgent": "🔥" if urgent else "",
            "status": STATUS.get(state, state),
            "desc": shorten(desc, 150),
        })
    return rows


def render(rows) -> str:
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    out = []
    out.append("# 📋 Takenoverzicht (leesbare versie)\n")
    out.append(
        f"> *Automatisch gegenereerd op {now} uit `todo.md` — "
        "NOT handmatig bewerken. Wijzig taken in de TMS en draai "
        "`~/bin/tms_human_view.py` opnieuw.*\n"
    )
    # Groepeer per sectie, in volgorde van eerste verschijning.
    order = []
    groups = {}
    for r in rows:
        if r["section"] not in groups:
            groups[r["section"]] = []
            order.append(r["section"])
        groups[r["section"]].append(r)

    for sec in order:
        out.append(f"\n## {sec}\n")
        out.append("| | Taak | Status | Toelichting |")
        out.append("|---|---|---|---|")
        for r in groups[sec]:
            desc = r["desc"] or "—"
            out.append(f"| {r['urgent']} | {r['title']} | {r['status']} | {desc} |")
    out.append("")
    return "\n".join(out)


def main():
    if not SRC.exists():
        sys.exit(f"Bron not found: {SRC}")
    rows = parse(SRC.read_text(encoding="utf-8").splitlines())
    text = render(rows)
    if "--stdout" in sys.argv:
        print(text)
    else:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(text, encoding="utf-8")
        print(f"Geschreven: {OUT}  ({len(rows)} taken)")


if __name__ == "__main__":
    main()
