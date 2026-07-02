import os
import subprocess
import re
from datetime import datetime

# All paths relative to HOME so this script travels unchanged into the
# public real-agent-setup capsule (PII-free, no machine-specific paths).
HOME = os.path.expanduser("~")
BRAIN = os.path.join(HOME, "BRAIN")
TMS_DIR = os.path.join(BRAIN, "tms")
LESSONS_DIR = os.path.join(BRAIN, "learned-lessons")
WORKSPACE_DIR = os.path.join(HOME, "workspace")
GUARDRAILS_FILE = os.path.join(BRAIN, "policies", "guardrails.md")


def run_command(command):
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        return result.stdout.strip()
    except Exception as e:
        return f"Error: {e}"


def get_tms_content():
    content = ""
    for name in ["todo.md", "in-progress.md", "done.md"]:
        full_path = os.path.join(TMS_DIR, name)
        if os.path.exists(full_path):
            with open(full_path, "r") as file:
                content += file.read().lower()
    return content


def check_git_activity(tms_content):
    print("🔍 Checking recent Git activity...")
    commits = run_command('git log --since="24 hours ago" --oneline')
    if not commits:
        print("✅ No recent local git commits found.")
        return True

    issues = []
    for line in commits.split('\n'):
        keywords = re.findall(r'#\d+|[a-zA-Z0-9\-]{4,}', line)
        found = False
        for kw in keywords:
            if kw.lower() in tms_content:
                found = True
                break
        if not found:
            issues.append(f"Commit not found in TMS: {line}")

    if issues:
        for issue in issues:
            print(f"❌ {issue}")
        return False
    print("✅ All recent commits are registered in TMS.")
    return True


def check_workspace_activity(tms_content):
    print(f"🔍 Checking {WORKSPACE_DIR} for unregistered changes...")
    if not os.path.exists(WORKSPACE_DIR):
        print("✅ Workspace directory not found, skipping.")
        return True

    cmd = (
        f"find {WORKSPACE_DIR} -mmin -120 -type f"
        " -not -path '*/node_modules/*' -not -path '*/.venv/*'"
        " -not -path '*/__pycache__/*' -not -path '*/.git/*'"
    )
    modified_files = run_command(cmd)

    if not modified_files:
        print("✅ No recent file changes in workspace.")
        return True

    issues = []
    for file_path in modified_files.split('\n'):
        if not file_path.strip():
            continue
        filename = os.path.basename(file_path)
        if filename in [".run_counter", "status.md", "README.md", "heartbeat.pulse", "VETTED_BOUNTIES.md"] or filename.endswith(".json") or filename.endswith(".pyc"):
            continue

        # Match on filename or on project folder (first segment under workspace/)
        rel = os.path.relpath(file_path, WORKSPACE_DIR)
        project = rel.split(os.sep)[0].lower()
        if filename.lower() not in tms_content and project not in tms_content:
            issues.append(f"File change not registered: {file_path}")

    if issues:
        for issue in issues:
            print(f"❌ {issue}")
        return False
    print("✅ Workspace changes appear to be registered.")
    return True


def check_learned_lessons_integrity():
    print("📚 Checking learned-lessons for policy compliance...")
    issues = []

    for root, dirs, files in os.walk(LESSONS_DIR):
        if os.sep + "archive" in root:
            continue
        for file in files:
            if file.endswith(".md") and file != "INDEX.md":
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r") as f:
                        content = f.read()
                        if not content.startswith("---") or "tier:" not in content or "category:" not in content:
                            issues.append(f"Invalid/Missing Frontmatter in: {file_path}")
                except Exception as e:
                    issues.append(f"Error reading {file_path}: {e}")

    if issues:
        for issue in issues:
            print(f"❌ {issue}")
        return False
    print("✅ All learned-lessons comply with Frontmatter policy.")
    return True


def check_index_coverage():
    """Librarian check: every lesson file must be listed in its category INDEX.md."""
    print("🗂️ Checking INDEX.md coverage of learned-lessons...")
    issues = []

    if not os.path.exists(LESSONS_DIR):
        print("✅ Lessons directory not found, skipping.")
        return True

    for category in os.listdir(LESSONS_DIR):
        cat_dir = os.path.join(LESSONS_DIR, category)
        if not os.path.isdir(cat_dir) or category == "archive":
            continue
        index_path = os.path.join(cat_dir, "INDEX.md")
        index_content = ""
        if os.path.exists(index_path):
            with open(index_path, "r") as f:
                index_content = f.read().lower()
        for file in os.listdir(cat_dir):
            if file.endswith(".md") and file != "INDEX.md":
                if file.lower() not in index_content:
                    issues.append(f"Lesson not listed in {category}/INDEX.md: {file}")

    if issues:
        for issue in issues:
            print(f"❌ {issue}")
        return False
    print("✅ All lessons are covered by their category INDEX.md.")
    return True


def parse_guardrails():
    """Reads the guardrails register (BRAIN/policies/guardrails.md).
    Each '## Guardrail:' block becomes a dict of its '- key: value' lines.
    Note: register keys are Dutch by contract (naam/bron/sectie/actief)."""
    if not os.path.exists(GUARDRAILS_FILE):
        return []
    with open(GUARDRAILS_FILE, "r") as f:
        content = f.read()

    guardrails = []
    for block in re.split(r"\n## Guardrail:", content)[1:]:
        lines = block.split("\n")
        rule = {"naam": lines[0].strip()}
        for line in lines[1:]:
            m = re.match(r"-\s+([\w-]+):\s*(.+)$", line.strip())
            if m:
                rule[m.group(1).lower()] = m.group(2).strip()
        guardrails.append(rule)
    return guardrails


def check_forbidden_terms_in_active_tms(rule):
    """Rule type 'verboden-termen-in-actieve-tms' (forbidden terms in active TMS):
    bold items from the given section of the source file must not appear in
    todo.md/in-progress.md."""
    source = os.path.expanduser(rule.get("bron", ""))
    section_heading = rule.get("sectie", "")
    if not source or not section_heading:
        print(f"⚠️ Guardrail '{rule['naam']}': 'bron' or 'sectie' key missing — skipped.")
        return True
    if not os.path.exists(source):
        print(f"⚠️ Guardrail '{rule['naam']}': source {source} not found — skipped.")
        return True

    with open(source, "r") as f:
        content = f.read()

    section = re.search(re.escape(section_heading) + r".*?(?=\n## |$)", content, re.DOTALL)
    if not section:
        print(f"⚠️ Guardrail '{rule['naam']}': section '{section_heading}' not found in {source} — skipped.")
        return True

    # Entries like "- **SecureBananaLabs (PR #7 & #214)**:" → search term "securebananalabs"
    raw_items = re.findall(r"-\s+\*\*([^*]+)\*\*", section.group(0))
    targets = [item.split("(")[0].strip().lower() for item in raw_items]
    targets = [t for t in targets if t]
    if not targets:
        print(f"✅ Guardrail '{rule['naam']}': no terms in the source section.")
        return True

    issues = []
    for name in ["todo.md", "in-progress.md"]:
        path = os.path.join(TMS_DIR, name)
        if not os.path.exists(path):
            continue
        with open(path, "r") as f:
            active_text = f.read().lower()
        for target in targets:
            if target in active_text:
                issues.append(f"Guardrail '{rule['naam']}': forbidden term '{target}' found in active {name}")

    if issues:
        for issue in issues:
            print(f"❌ {issue}")
        return False
    print(f"✅ Guardrail '{rule['naam']}': OK ({len(targets)} terms checked against the active TMS).")
    return True


RULE_TYPES = {
    "verboden-termen-in-actieve-tms": check_forbidden_terms_in_active_tms,
}


def check_guardrails():
    """Generic enforcement of the guardrails register. Domain knowledge lives in
    BRAIN/policies/guardrails.md (and the source files it points to),
    never in this code."""
    print("🛡️ Checking guardrails (BRAIN/policies/guardrails.md)...")
    guardrails = parse_guardrails()
    if not guardrails:
        print("✅ No guardrails register (or empty) — check skipped.")
        return True

    all_ok = True
    for rule in guardrails:
        if rule.get("actief", "ja").lower() in ("nee", "no", "false"):
            print(f"⏸️ Guardrail '{rule['naam']}': inactive — skipped.")
            continue
        handler = RULE_TYPES.get(rule.get("type", ""))
        if handler is None:
            print(f"⚠️ Guardrail '{rule['naam']}': unknown type '{rule.get('type')}' — skipped (typo in the register?).")
            continue
        if not handler(rule):
            all_ok = False
    return all_ok


def main():
    print(f"🛡️ TMS Integrity Hook - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    tms_content = get_tms_content()

    git_ok = check_git_activity(tms_content)
    workspace_ok = check_workspace_activity(tms_content)
    lessons_ok = check_learned_lessons_integrity()
    index_ok = check_index_coverage()
    guardrails_ok = check_guardrails()

    if git_ok and workspace_ok and lessons_ok and index_ok and guardrails_ok:
        print("\n🟢 TMS is CLEAN AND UPTODATE. All activities registered.")
        exit(0)
    else:
        print("\n🔴 TMS DISCREPANCY DETECTED. Please update your logs before finishing.")
        exit(1)


if __name__ == "__main__":
    main()
