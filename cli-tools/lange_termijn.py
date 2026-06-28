#!/usr/bin/env python3
"""lange_termijn.py — LANGE-TERMIJN-overzicht (codewoord: "LANGE TERMIJN").

Tegenhanger van agenda_sweep.py (het weekoverzicht). Rendert:
  * de masterplan-kern (DEEL 2: tijdlijn-ankers + 4 domeinen) uit
    PLAN/masterplan_2026_2032.md, en
  * de lange-horizon TMS-secties uit BRAIN/tms/todo.md
    (Masterplan / Real Life Long Term / Bounty Hunting / Film).
Output to INFO/owner/lange_termijn.md and stdout.

AFGELEIDE WEERGAVE (CLAUDE.md regel 1.b): wijzig de masterplan of de TMS,
not dit file; draai het script opnieuw.

Usage: lange_termijn.py            -> write file + print
          lange_termijn.py --stdout   -> alleen printen
"""
import re
import sys
import datetime
from pathlib import Path

HOME = Path.home()
MASTERPLAN = HOME / "PLAN" / "masterplan_2026_2032.md"
TODO = HOME / "BRAIN" / "tms" / "todo.md"
OUT = HOME / "INFO" / "owner" / "lange_termijn.md"

WANTED = ["masterplan", "real life long term", "bounty", "film"]
CHECK_OPEN = re.compile(r"^\s*- \[([ /])\]\s*(.*)$")
TIER = re.compile(r"^\[(Ephemeral|Sprint|Strategic|Eternal)\]\s*")
H2 = re.compile(r"^##\s+(.*)$")
LINK = re.compile(r"\[([^\]]+)\]\([^)]*\)")
URL = re.compile(r"https?://\S+|file://\S+")


def clean(t, limit=240):
    t = LINK.sub(r"\1", t)
    t = URL.sub("", t)
    t = t.replace("**", "").replace("`", "")
    t = re.sub(r"\s+", " ", t).strip(" ;–-:")
    if len(t) > limit:
        t = t[:limit].rsplit(" ", 1)[0] + "…"
    return t.strip()


def masterplan_core():
    if not MASTERPLAN.exists():
        return ["*(masterplan_2026_2032.md not found)*"]
    lines = MASTERPLAN.read_text(encoding="utf-8").splitlines()
    out = []
    for l in lines[:6]:
        if "Horizon" in l or "Status" in l:
            out.append("> " + clean(l, 320))
            break
    grab = False
    for l in lines:
        if re.match(r"^##\s+DEEL 2", l):
            grab = True
            continue
        if re.match(r"^##\s+DEEL 3", l):
            break
        if grab:
            out.append(l.rstrip())
    return out


def tms_longhorizon():
    result = []
    if not TODO.exists():
        return result
    cur, items = None, []
    for l in TODO.read_text(encoding="utf-8").splitlines():
        m = H2.match(l)
        if m:
            if cur and items:
                result.append((cur, items))
            sec = m.group(1)
            cur = sec if any(k in sec.lower() for k in WANTED) else None
            items = []
            continue
        if cur:
            cm = CHECK_OPEN.match(l)
            if cm:
                body = TIER.sub("", cm.group(2).strip())
                indent = "  ↳ " if l[:1] in (" ", "\t") else ""
                items.append(indent + clean(body))
    if cur and items:
        result.append((cur, items))
    return result


def build():
    out = ["# 🧭 Lange termijn — masterplan & strategische horizon\n"]
    out.append(
        f"> *Gegenereerd {datetime.datetime.now():%Y-%m-%d %H:%M} door "
        "`~/bin/lange_termijn.py` (codewoord: \"LANGE TERMIJN\"). Bron: "
        "PLAN/masterplan_2026_2032.md + lange-horizon TMS-secties. "
        "NOT handmatig bewerken — wijzig in de bron, draai opnieuw.*\n")
    out.append("\n## 🗺️ Masterplan (6 jaar)\n")
    out += masterplan_core()
    out.append("\n## ✅ Lange-horizon taken (TMS)\n")
    for sec, items in tms_longhorizon():
        out.append(f"\n### {clean(sec)}\n")
        out += [f"- {it}" for it in items]
    out.append("\n---\n")
    out.append("**Bronnen:** PLAN/masterplan_2026_2032.md · BRAIN/tms/todo.md "
               "(secties: Masterplan · Real Life Long Term · Bounty Hunting · Film)")
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
