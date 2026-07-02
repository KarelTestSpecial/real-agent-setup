#!/usr/bin/env python3
import sys, os, json, argparse, re, datetime

sys.path.insert(0, os.path.expanduser("~/INFRA/agents-brain/lib"))
from memanto_engine import MemantoMemory, MEMANTO_CATEGORIES

BRAIN = os.path.expanduser("~/BRAIN")
MEMORY_FILE = os.path.join(BRAIN, "memanto/memanto_global.json")
LESSONS_DIR = os.path.join(BRAIN, "learned-lessons")
GLOBAL_LESSONS = os.path.expanduser("~/.gemini/lessons")

brain = MemantoMemory(memory_file=MEMORY_FILE)

def cmd_remember(args):
    mid = brain.remember(args.text, args.category, confidence=args.confidence, source=args.source)
    print(mid)

def cmd_recall(args):
    results = brain.recall(args.query, category=args.category, limit=args.limit)
    print(json.dumps(results, indent=2))

def cmd_answer(args):
    print(brain.answer(args.query, category=args.category))

def cmd_list(args):
    results = brain.recall("", category=args.category, limit=500)
    print(json.dumps(results, indent=2))

def cmd_prime(args):
    output = ["# Opencode Session Prime", ""]
    output.append("## Recente Memories (Memanto)")
    recent = brain.recall("", limit=10)
    for m in recent:
        output.append(f"- [{m['category']}] (conf:{m['confidence']:.2f}) {m['text']}")
    if not recent:
        output.append("- No actieve herinneringen.")
    output.append("")
    output.append("## Learned Lessons Index")
    if os.path.isdir(LESSONS_DIR):
        for entry in sorted(os.listdir(LESSONS_DIR)):
            ep = os.path.join(LESSONS_DIR, entry)
            if entry == "archive":
                continue
            if os.path.isdir(ep):
                files = []
                for root, dirs, filenames in os.walk(ep):
                    for f in filenames:
                        if f.endswith(".md") and f != "INDEX.md":
                            files.append(os.path.relpath(os.path.join(root, f), ep))
                if files:
                    output.append(f"\n### {entry.capitalize()}")
                    for f in sorted(files):
                        fp = os.path.join(ep, f)
                        with open(fp) as fh:
                            fl = fh.readline().strip().lstrip("# ")
                        output.append(f"- **{f.replace('.md','')}**: {fl}")
            elif entry.endswith(".md"):
                with open(ep) as fh:
                    fl = fh.readline().strip().lstrip("# ")
                output.append(f"- **{entry.replace('.md','')}**: {fl}")
    output.append("")
    sp = os.path.expanduser("~/BRAIN/STATE.md")
    if os.path.exists(sp):
        with open(sp) as f:
            c = f.read()
        fm = re.search(r"## \U0001f680 Actieve Focus(.*?)(?=\n##)", c, re.DOTALL)
        if fm:
            output.append(f"## Active Focus (STATE.md)\n{fm.group(1).strip()}")
    print("\n".join(output))

def cmd_distill(args):
    global_kw = ["security", "infra", "supply.chain", "ssh", "git", "pip", "npm", "pnpm", "supply.chain"]
    is_global = any(kw in args.title.lower() or kw in args.content.lower() for kw in global_kw)
    cat = args.category or "technical"
    if is_global:
        target = os.path.join(GLOBAL_LESSONS)
    else:
        target = os.path.join(LESSONS_DIR, cat)
    os.makedirs(target, exist_ok=True)
    fn = args.title.lower().replace(" ", "_").replace("/", "-")[:50] + ".md"
    fp = os.path.join(target, fn)
    with open(fp, "w") as f:
        f.write(f"---\ntitle: {args.title}\ntier: {'global' if is_global else 'local'}\ncategory: {cat}\n---\n\n# {args.title}\n\n{args.content}\n")
    mid = brain.remember(f"[{cat}] {args.title}: {args.content[:200]}", category="Learning", source="distill")
    print(f"Lesson '{args.title}' -> {'GLOBAL' if is_global else f'learned-lessons/{cat}'}")
    print(f"File: {fp}\nMemanto ID: {mid}")

def cmd_prune(args):
    """Flow-through: clean up decayed working-memory entries (default: Event < 0.2).
    Curated categories (Learning/Preference/Fact) are never touched."""
    PROTECTED = {"Learning", "Preference", "Fact"}
    cats = [c.strip() for c in args.category.split(",")] if args.category else ["Event"]
    if any(c in PROTECTED for c in cats):
        print(f"REFUSED: curated category {PROTECTED & set(cats)} must not be pruned.")
        sys.exit(1)
    before = list(brain.memories)
    doomed = [m for m in before
              if m.get("category") in cats and m.get("confidence", 1.0) < args.threshold]
    keep = [m for m in before if m not in doomed]
    print(f"Store: {len(before)} entries | weg: {len(doomed)} ({','.join(cats)} < {args.threshold}) | blijft: {len(keep)}")
    for m in doomed[:10]:
        print(f"  - conf={m.get('confidence', 0):.2f} | {m.get('text', '')[:60]}")
    if len(doomed) > 10:
        print(f"  ... +{len(doomed) - 10} meer")
    if args.dry_run:
        print("(dry-run: niets geschreven)")
        return
    if not doomed:
        return
    bak = MEMORY_FILE + ".bak-" + datetime.date.today().strftime("%Y%m%d")
    with open(bak, "w") as f:
        json.dump(before, f, ensure_ascii=False, indent=2)
    brain.memories = keep
    brain._save_memories()
    # Rotate backups: flow through instead of piling up — keep only the newest KEEP_BAKS.
    KEEP_BAKS = 3
    import glob
    olds = sorted(glob.glob(MEMORY_FILE + ".bak-*"))
    for stale in olds[:-KEEP_BAKS]:
        os.remove(stale)
    print(f"Cleaned up. Backup: {bak} (keeping newest {KEEP_BAKS}, removed {max(0, len(olds) - KEEP_BAKS)} old)")

if __name__ == "__main__":
    p = argparse.ArgumentParser(prog="memanto", description="Memanto + Librarian CLI")
    sub = p.add_subparsers(dest="command", required=True)

    rp = sub.add_parser("remember")
    rp.add_argument("text"); rp.add_argument("--category", default="Fact", choices=list(MEMANTO_CATEGORIES.keys()))
    rp.add_argument("--confidence", type=float, default=1.0); rp.add_argument("--source", default="opencode-agent")

    rcl = sub.add_parser("recall")
    rcl.add_argument("query"); rcl.add_argument("--category"); rcl.add_argument("--limit", type=int, default=5)

    ap = sub.add_parser("answer")
    ap.add_argument("query"); ap.add_argument("--category")

    lp = sub.add_parser("list")
    lp.add_argument("--category")

    pp = sub.add_parser("prime")
    pp.add_argument("--category")

    dp = sub.add_parser("distill")
    dp.add_argument("title"); dp.add_argument("content"); dp.add_argument("--category")

    prn = sub.add_parser("prune", help="Ruim uitgedoofde werkgeheugen-entries op (default: Event < 0.2)")
    prn.add_argument("--category", help="Komma-gescheiden categorieen (default: Event)")
    prn.add_argument("--threshold", type=float, default=0.2, help="Remove entries met confidence < drempel")
    prn.add_argument("--dry-run", action="store_true", help="Toon wat zou wegvallen, schrijf niets")

    args = p.parse_args()
    {"remember": cmd_remember, "recall": cmd_recall, "answer": cmd_answer, "list": cmd_list, "prime": cmd_prime, "distill": cmd_distill, "prune": cmd_prune}[args.command](args)
