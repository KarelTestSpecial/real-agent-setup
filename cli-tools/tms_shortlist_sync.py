#!/usr/bin/env python3
# ==============================================================================
# Script: tms_shortlist_sync.py
# Description: Checks if [todo] items from SHORTLIST.md are semantically or 
#              heuristically represented in todo.md or in-progress.md.
# ==============================================================================

import re
import os
import sys

# Nederlandse/Engelse stopwoorden die no semantische waarde hebben voor matching
STOPWORDS = {
    "de", "het", "een", "en", "van", "voor", "met", "aan", "bij", "naar", "uit",
    "te", "in", "op", "of", "dat", "die", "dit", "deze", "is", "zijn", "wordt",
    "worden", "nog", "ook", "the", "and", "for", "with", "all", "etc", "nodig",
}


def significant_words(text):
    return {w for w in re.findall(r'\w+', text.lower()) if len(w) >= 4 and w not in STOPWORDS}


def stem_overlap(words_a, words_b):
    """Telt semantische matches incl. samenstellingen: 'belasting' matcht
    'belastingregister', 'betalen' matcht 'uitbetaling' (stam = eerste 5 tekens)."""
    count = 0
    for a in words_a:
        stem_a = a[:5] if len(a) >= 5 else a
        for b in words_b:
            stem_b = b[:5] if len(b) >= 5 else b
            if stem_a in b or stem_b in a:
                count += 1
                break
    return count


def load_synonym_groups():
    """Optionele, private synoniem-groepen (domeinkennis hoort in data, not in code).
    Formaat: één groep per regel, komma-gescheiden. Ontbreekt het file, dan
    werkt het script gewoon without synoniemen."""
    path = os.path.expanduser("~/BRAIN/policies/shortlist-synoniemen.txt")
    groups = []
    if os.path.exists(path):
        with open(path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                terms = [t.strip().lower() for t in line.split(",") if t.strip()]
                if terms:
                    groups.append(terms)
    return groups

def load_shortlist_todos(filepath):
    todos = []
    if not os.path.exists(filepath):
        return todos
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            # Match lines starting with - [ ] [todo] or similar
            match = re.match(r'^-\s+\[\s*\]\s+\[todo\]\s+(.+)$', line, re.IGNORECASE)
            if match:
                todos.append(match.group(1).strip())
    return todos

def load_tms_tasks(filepaths):
    tasks = []
    for filepath in filepaths:
        if not os.path.exists(filepath):
            continue
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                match = re.match(r'^-\s+\[([ x/])\]\s+(.+)$', line)
                if match:
                    status = match.group(1)
                    content = match.group(2).strip()
                    tasks.append({
                        "status": status,
                        "content": content,
                        "file": os.path.basename(filepath),
                        "line": line
                    })
    return tasks

def main():
    home = os.path.expanduser("~")
    shortlist_path = os.path.join(home, "SHORTLIST.md")
    todo_paths = [
        os.path.join(home, "todo.md"),
        os.path.join(home, "in-progress.md")
    ]
    
    synonym_groups = load_synonym_groups()
    shortlist_todos = load_shortlist_todos(shortlist_path)
    if not shortlist_todos:
        print("🟢 No [todo] items found in SHORTLIST.md.")
        sys.exit(0)
        
    tms_tasks = load_tms_tasks(todo_paths)
    
    print("📋 TMS Shortlist Sync Rapport")
    print("==================================================")
    print(f"Aantal [todo] items in SHORTLIST.md: {len(shortlist_todos)}")
    print(f"Aantal actieve TMS-taken: {len(tms_tasks)}")
    print("--------------------------------------------------\n")
    
    discrepancies = 0
    
    for i, todo in enumerate(shortlist_todos, 1):
        print(f"{i}. SHORTLIST: \"{todo}\"")
        
        # Check overlaps
        matches = []
        todo_lower = todo.lower()
        todo_words = significant_words(todo_lower)

        for task in tms_tasks:
            task_lower = task["content"].lower()
            task_words = significant_words(task_lower)
            overlap = todo_words.intersection(task_words)

            # Match if overlap has key nouns/verbs, or simple substring relation, or semantic keywords
            is_match = False
            if len(overlap) >= 3:
                is_match = True
            elif stem_overlap(todo_words, task_words) >= 2:
                is_match = True
            elif todo_lower in task_lower or task_lower in todo_lower:
                is_match = True
            else:
                # Private synoniem-groepen (uit ~/BRAIN/policies/shortlist-synoniemen.txt):
                # shortlist-item en taak die elk een term uit dezelfde groep bevatten = match
                for group in synonym_groups:
                    if any(t in todo_lower for t in group) and any(t in task_lower for t in group):
                        is_match = True
                        break
            
            if is_match:
                matches.append(task)
                
        if matches:
            print("   ✅ Found matches in TMS:")
            for m in matches:
                status_str = "Completed" if m["status"] == "x" else "In uitvoering" if m["status"] == "/" else "Te doen"
                print(f"      • [{m['file']}] ({status_str}): {m['content']}")
        else:
            print("   ⚠️  NO MATCH FOUND IN todo.md OF in-progress.md!")
            discrepancies += 1
            
        print("")
        
    if discrepancies > 0:
        print(f"❌ Synchronisatie failed: {discrepancies} item(s) not vertegenwoordigd in TMS.")
        sys.exit(1)
    else:
        print("🟢 Synchronisatie OK: Alle [todo] items zijn gedekt in TMS.")
        sys.exit(0)

if __name__ == "__main__":
    main()
