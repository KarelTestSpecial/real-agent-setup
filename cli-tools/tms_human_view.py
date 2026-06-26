#!/usr/bin/env python3
"""tms_human_view.py — generates a human-friendly table from todo.md.

DERIVED VIEW (AGENTS.md rule 1.b: one fact, one owner).
Source = BRAIN/tms/todo.md. Output must NEVER be edited by hand;
always change tasks in todo.md and re-run this script.

Usage:  tms_human_view.py            -> writes to the default output path
        tms_human_view.py --stdout   -> prints to screen
"""
import re
import sys
import datetime
from pathlib import Path

HOME = Path.home()
SRC = HOME / "BRAIN" / "tms" / "todo.md"
OUT = HOME / "INFO" / "for-owner" / "todo_overview.md"

STATUS = {" ": "⬜ Open", "/": "🔄 In progress", "x": "✅ Done"}

# Friendlier section names in the output.
SECTION_RENAME = {"Cron Jobs": "Recurring"}

CHECKBOX = re.compile(r"^(\s*)- \[([ /x])\]\s*(.*)$")
SECTION = re.compile(r"^##\s+(.*)$")
TIER = re.compile(r"^\[(Ephemeral|Sprint|Strategic|Eternal)\]\s*")
LINK = re.compile(r"\[([^\]]+)\]\([^)]*\)")        # [text](url) -> text
BARE_FILE = re.compile(r"\(?file://\S+\)?")         # bare file:// paths
BARE_URL = re.compile(r"https?://\S+")
BOLD = re.compile(r"\*\*(.+?)\*\*")


def clean_emoji_headers(s: str) -> str:
    # Remove leading emoji/icons + trailing tier label from section titles.
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
    """Extract title + short description from the raw item text."""
    body = body.strip()
    m = BOLD.search(body)
    if m:
        title = m.group(1).strip()
        rest = body[m.end():].lstrip(" :—-")
    else:
        # No bold: title = part before the first separator.
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
        # Strip the tier label and urgency flame.
        body = TIER.sub("", body)
        urgent = "🔥" in body
        body = body.replace("🔥", "").strip()
        title, desc = split_title_desc(body)
        if indent:  # subtask
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
    out.append("# 📋 Task Overview (readable version)\n")
    out.append(
        f"> *Automatically generated on {now} from `todo.md` — "
        "do NOT edit by hand. Change tasks in the TMS and re-run "
        "`~/bin/tms_human_view.py`.*\n"
    )
    # Group per section, in order of first appearance.
    order = []
    groups = {}
    for r in rows:
        if r["section"] not in groups:
            groups[r["section"]] = []
            order.append(r["section"])
        groups[r["section"]].append(r)

    for sec in order:
        out.append(f"\n## {sec}\n")
        out.append("| | Task | Status | Notes |")
        out.append("|---|---|---|---|")
        for r in groups[sec]:
            desc = r["desc"] or "—"
            out.append(f"| {r['urgent']} | {r['title']} | {r['status']} | {desc} |")
    out.append("")
    return "\n".join(out)


def main():
    if not SRC.exists():
        sys.exit(f"Source not found: {SRC}")
    rows = parse(SRC.read_text(encoding="utf-8").splitlines())
    text = render(rows)
    if "--stdout" in sys.argv:
        print(text)
    else:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(text, encoding="utf-8")
        print(f"Written: {OUT}  ({len(rows)} tasks)")


if __name__ == "__main__":
    main()
