import os
import subprocess
import re
import glob
import json
from datetime import datetime

# All paths relative to HOME so this script travels unchanged into the
# public real-agent-setup capsule (PII-free, no machine-specific paths).
HOME = os.path.expanduser("~")
BRAIN = os.path.join(HOME, "BRAIN")
TMS_DIR = os.path.join(BRAIN, "tms")
LESSONS_DIR = os.path.join(BRAIN, "learned-lessons")
WORKSPACE_DIR = os.path.join(HOME, "workspace")
GUARDRAILS_FILE = os.path.join(BRAIN, "policies", "guardrails.md")
ARCHIVE_DIR = os.path.join(BRAIN, "archive")
INFRA_BACKUPS = os.path.join(HOME, "INFRA", "backups")
BIN_MACCHA = os.path.join(HOME, "bin", "maccha")
PUBLISH_MARKER = os.path.join(HOME, ".config", "maccha", "last_publish")
# Both are scanned: BRAIN/archive = curated knowledge archive (permanent
# entries allowed), INFRA/backups = temporary restore points (never permanent).
ARCHIVE_DIRS = [ARCHIVE_DIR, INFRA_BACKUPS]

# Guardrail register keys: English (shipped template) → Dutch (hook internals).
# An unknown key is not fatal, it is ignored — which is exactly how an English
# `type:` used to become "unknown type" instead of an enforced rule.
GUARDRAIL_KEY_ALIASES = {
    "name": "naam",
    "active": "actief",
    "source": "bron",
    "section": "sectie",
}


def run_command(command):
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        return result.stdout.strip()
    except Exception as e:
        return f"Error: {e}"


def get_tms_content():
    content = ""
    for name in ["todo.md", "in-progress.md", "backlog.md", "done.md"]:
        full_path = os.path.join(TMS_DIR, name)
        if os.path.exists(full_path):
            with open(full_path, "r") as file:
                content += file.read().lower()
    return content


def _vind_repos():
    """All git repositories under ~/workspace (max. two levels deep)."""
    repos = []
    root = WORKSPACE_DIR
    if not os.path.isdir(root):
        return repos
    for depth in (1, 2):
        pat = os.path.join(root, *(["*"] * depth), ".git")
        for gitdir in glob.glob(pat):
            repos.append(os.path.dirname(gitdir))
    return sorted(set(repos))


def check_git_activity(tms_content):
    """Check that recent commits in the workspace repos are registered in the TMS.

    This used to run as a bare `git log` in whatever working directory the hook
    was started from. That happens to be some other repo (or none at all) — on
    2/10 the hook reported "No recent local git commits found" while that day
    had eight commits in ~/workspace/werk-inkomen/vdab-swipe. Now every repo under
    workspace/ is checked separately.

    Penalty rule: a repo that is itself mentioned in the TMS is checked strictly
    per commit (an unregistered commit = error). A repo that is not in the TMS
    only produces a warning, because not every project has to be registered in
    the TMS — otherwise this check would permanently scream about projects that
    User deliberately keeps outside the TMS.
    """
    print("🔍 Checking recent Git activity per repo...")

    # legacy behaviour: the repo the hook started in, if there is one
    eigen_repo = run_command('git rev-parse --show-toplevel 2>/dev/null').strip()
    repos = _vind_repos()
    if eigen_repo and eigen_repo not in repos:
        repos.append(eigen_repo)

    if not repos:
        print("⚠️ No git repo found (not even under workspace/).")
        return True

    hard_fail = False
    ongezien = 0
    for repo in repos:
        commits = run_command('git -C "%s" log --since="24 hours ago" --oneline' % repo)
        naam = os.path.basename(repo)
        if not commits:
            continue
        ongezien += len(commits.split('\n'))
        in_tms = naam.lower() in tms_content.lower()
        if not in_tms:
            print(f"⚠️ {naam}: {len(commits.split(chr(10)))} commits in 24h, but '{naam}' is not in the TMS.")
            continue
        issues = []
        for line in commits.split('\n'):
            if not line.strip():
                continue
            keywords = re.findall(r'#\d+|[a-zA-Z0-9\-]{4,}', line)
            if not any(kw.lower() in tms_content for kw in keywords):
                issues.append(line)
        for issue in issues:
            print(f"❌ Commit not in the TMS ({naam}): {issue}")
            hard_fail = True

    if not ongezien:
        print("✅ No commits in the last 24 hours.")
        return True
    if hard_fail:
        return False
    print(f"✅ {ongezien} commit(s) in 24h, all registered or deliberately outside the TMS.")
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
        " -not -path '*/build/*' -not -path '*/dist/*'"
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


def _read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _frontmatter(text):
    """Return the frontmatter block (without the ---), or None when the file has none."""
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    return text[3:end] if end != -1 else None


def _domain_files(cat_dir):
    """Domain files = the .md files that INDEX.md lists as a domain.

    Since v1.5.0 a bank may ship without INDEX.md (the router layout: ROUTER.md
    plus one domain file per domain). There a domain file is simply a .md file
    without frontmatter — lessons always carry frontmatter, domain files never
    do — so derive the list from the content instead of returning nothing.
    """
    idx = os.path.join(cat_dir, "INDEX.md")
    if os.path.exists(idx):
        return re.findall(r"\]\(([a-z0-9-]+)\.md\)", _read(idx))
    domains = []
    try:
        entries = sorted(os.listdir(cat_dir))
    except OSError:
        return domains
    for entry in entries:
        if not entry.endswith(".md") or entry == "INDEX.md":
            continue
        try:
            if _frontmatter(_read(os.path.join(cat_dir, entry))) is None:
                domains.append(entry[:-3])
        except OSError:
            continue
    return domains


def check_learned_lessons_integrity():
    print("📚 Checking learned-lessons for policy compliance...")
    issues = []

    for root, dirs, files in os.walk(LESSONS_DIR):
        rel = os.path.relpath(root, LESSONS_DIR)
        if rel == "." or rel.split(os.sep)[0] == "archive":
            continue
        cat_dir = os.path.join(LESSONS_DIR, rel.split(os.sep)[0])
        domain_files = _domain_files(cat_dir)
        for file in files:
            if not file.endswith(".md") or file == "INDEX.md":
                continue
            path = os.path.join(root, file)
            try:
                text = _read(path)
            except Exception as e:
                issues.append(f"Error reading {path}: {e}")
                continue
            fm = _frontmatter(text)
            if fm is None:
                # no frontmatter = domain file; it belongs in INDEX.md
                if file[:-3] not in domain_files:
                    issues.append(f"No frontmatter and not a domain file: {path}")
                continue
            for key in ("tier:", "category:", "domain:"):
                if key not in fm:
                    issues.append(f"Frontmatter missing '{key}' in: {path}")

    if issues:
        for issue in issues:
            print(f"❌ {issue}")
        return False
    print("✅ All learned-lessons comply with Frontmatter policy.")
    return True


def check_index_coverage():
    """Every lesson sits in the domain file of its `domain:`; ROUTER knows every
    domain; when the bank keeps an INDEX.md, its lesson counts must match."""
    print("🗂️ Checking INDEX/domain-file coverage of learned-lessons...")
    issues = []

    if not os.path.exists(LESSONS_DIR):
        print("✅ Lessons directory not found, skipping.")
        return True

    router_path = os.path.join(LESSONS_DIR, "ROUTER.md")
    router = _read(router_path) if os.path.exists(router_path) else ""

    for category in sorted(os.listdir(LESSONS_DIR)):
        cat_dir = os.path.join(LESSONS_DIR, category)
        if not os.path.isdir(cat_dir) or category == "archive":
            continue
        index_path = os.path.join(cat_dir, "INDEX.md")
        has_index = os.path.exists(index_path)
        index = _read(index_path) if has_index else ""
        domains = _domain_files(cat_dir)
        if not domains:
            issues.append(f"No domain files in {category}/")
            continue

        for d in domains:
            path = os.path.join(cat_dir, d + ".md")
            if not os.path.exists(path):
                issues.append(f"Domain file missing: {category}/{d}.md")
                continue
            body = _read(path)
            if f"{d}.md" not in router:
                issues.append(f"Domain not in ROUTER.md: {category}/{d}.md")
            # The lesson count lives in INDEX.md. A router-only bank has no
            # INDEX to keep in sync, so there the domain file itself is the
            # source of truth and only its links are checked.
            if has_index:
                m = re.search(rf"\[{re.escape(d)}\]\({re.escape(d)}\.md\) — (\d+) les", index)
                actual = len(re.findall(r"^- \[", body, re.M))
                if not m:
                    issues.append(f"Domain not in INDEX.md: {category}/{d}.md")
                elif int(m.group(1)) != actual:
                    issues.append(f"INDEX says {m.group(1)} instead of {actual} lessons in {category}/{d}.md")
            for target in re.findall(r"\]\(([^)]+\.md)\)", body):
                if not os.path.exists(os.path.normpath(os.path.join(cat_dir, target))):
                    issues.append(f"Dead link in {category}/{d}.md: {target}")

        for file in sorted(os.listdir(cat_dir)):
            if not file.endswith(".md") or file == "INDEX.md":
                continue
            path = os.path.join(cat_dir, file)
            fm = _frontmatter(_read(path))
            if fm is None:
                continue  # domeinbestand
            m = re.search(r"^domain:\s*(.+)$", fm, re.M)
            if not m:
                continue  # al gemeld door de frontmatter-check
            dom = m.group(1).strip()
            if dom not in domains:
                issues.append(f"Lesson with unknown domain '{dom}': {category}/{file}")
                continue
            listed = _read(os.path.join(cat_dir, dom + ".md"))
            if not re.search(r"\]\(" + re.escape(file) + r"\)", listed):
                issues.append(f"Lesson not listed as a link in {category}/{dom}.md: {file}")

    if issues:
        for issue in issues:
            print(f"❌ {issue}")
        return False
    print("✅ All lessons are covered by their domain file, ROUTER (and INDEX count where present).")
    return True


def parse_guardrails():
    """Reads the guardrails register (BRAIN/policies/guardrails.md).

    Each '## Guardrail:' block becomes a dict of its '- key: value' lines. The
    shipped template is English (naam→name, actief→active, bron→source,
    sectie→section) while older personal registers are Dutch; both are accepted
    so neither the template nor an existing register is silently ignored.
    """
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
                key = m.group(1).lower()
                rule[GUARDRAIL_KEY_ALIASES.get(key, key)] = m.group(2).strip()
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
    for name in ["todo.md", "in-progress.md", "backlog.md"]:
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
    "forbidden-terms-in-active-tms": check_forbidden_terms_in_active_tms,
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


def check_archive_retention():
    """Signal (never block) archive items past their retention window.

    Retention lives in BRAIN/archive/README.md inside a machine-readable
    RETENTIE block (owner of the policy): `permanent = <names>`,
    `overig_dagen = <n>`, `max_mb = <n>`. `permanent` only exempts entries
    in BRAIN/archive; INFRA/backups entries always age out. Removal stays
    HITL (owner's OK per item).
    """
    print(f"📦 Checking retention: {' + '.join(os.path.relpath(d, HOME) for d in ARCHIVE_DIRS)} ...")
    if not any(os.path.isdir(d) for d in ARCHIVE_DIRS):
        print("✅ No archive/backup directories, skipping.")
        return True

    permanent = set()
    max_days = 180
    max_mb = 5
    readme = os.path.join(ARCHIVE_DIR, "README.md")
    try:
        with open(readme, "r") as f:
            txt = f.read()
        m = re.search(r"<!--\s*RETENTIE\s*(.*?)\s*RETENTIE\s*-->", txt, re.S)
        if not m:
            print("⚠️ RETENTIE block missing in archive README — using defaults (180d / 5MB).")
        else:
            for line in m.group(1).splitlines():
                line = line.strip()
                if not line or "=" not in line:
                    continue
                key, val = (p.strip() for p in line.split("=", 1))
                if key == "permanent":
                    permanent.update(p.strip() for p in val.split(",") if p.strip())
                elif key == "overig_dagen":
                    max_days = int(val)
                elif key == "max_mb":
                    max_mb = int(val)
    except FileNotFoundError:
        print("⚠️ No archive README — using defaults (180d / 5MB).")
    except Exception as e:
        print(f"⚠️ Could not read archive retention config ({e}) — using defaults.")

    now = datetime.now()
    overruns = []
    total_kb = 0
    for base in ARCHIVE_DIRS:
        if not os.path.isdir(base):
            continue
        du = run_command(f"du -sk {base}")
        if du and du.split()[0].isdigit():
            total_kb += int(du.split()[0])
        for entry in sorted(os.listdir(base)):
            path = os.path.join(base, entry)
            if base == ARCHIVE_DIR and entry in permanent:
                continue
            try:
                age_days = (now - datetime.fromtimestamp(os.path.getmtime(path))).days
            except OSError:
                continue
            if age_days > max_days:
                overruns.append(f"{os.path.relpath(path, HOME)} ({age_days}d old, limit {max_days}d)")

    mb = total_kb / 1024

    for o in overruns:
        print(f"⚠️ Past retention: {o} — schedule removal (owner's OK required).")
    if mb > max_mb:
        print(f"⚠️ Archive+backups total {mb:.1f}MB exceeds the {max_mb}MB budget — propose a sweep.")
    if not overruns and mb <= max_mb:
        print(f"✅ Retention OK ({total_kb}K / {max_mb}MB budget; items ≤{max_days}d or permanent).")
    return True


def _publish_allowlist_names():
    """Names in ~/bin/maccha that publish.sh would actually ship (cli-tools/*).

    Reads real-agent-setup/.publish-allowlist (the fail-closed curation that
    publish.sh enforces). Returns None when it cannot be read — the caller then
    falls back to warning about everything instead of silently going quiet.
    """
    path = os.path.join(HOME, "real-agent-setup", ".publish-allowlist")
    try:
        with open(path) as f:
            lines = f.readlines()
    except OSError:
        return None
    names = set()
    for line in lines:
        line = line.split("#", 1)[0].strip()
        if not line.startswith("cli-tools/"):
            continue
        rel = line[len("cli-tools/"):]
        if rel and "/" not in rel:
            names.add(rel)
    return names


def check_publish_drift():
    """Remind (never block) that changed publishable tools may not be synced yet.

    publish.sh drops a timestamp in ~/.config/maccha/last_publish whenever the
    local tooling matches the repo. Only files on .publish-allowlist can drift
    (they are what ships); local-only scripts are expected to differ and get a
    neutral line instead of a warning (tool-zones rule, PLAN 20261017).
    """
    print(f"📤 Checking publish drift for {os.path.relpath(BIN_MACCHA, HOME)} ...")
    if not os.path.isdir(BIN_MACCHA):
        print("✅ No local tooling directory, skipping.")
        return True
    if not os.path.isfile(PUBLISH_MARKER):
        print("ℹ️ No publish marker yet (publish.sh writes it on success) — drift check skipped.")
        return True
    try:
        with open(PUBLISH_MARKER) as f:
            last = int(f.read().strip())
    except ValueError:
        print("⚠️ Publish marker unreadable — run publish.sh once to refresh it.")
        return True

    allow = _publish_allowlist_names()
    newest_pub = (0.0, "")
    local_hits = []
    for entry in os.listdir(BIN_MACCHA):
        if entry in ("__pycache__", ".git", "node_modules"):
            continue
        path = os.path.join(BIN_MACCHA, entry)
        try:
            mt = os.path.getmtime(path)
        except OSError:
            continue
        if allow is None or entry in allow:
            if mt > newest_pub[0]:
                newest_pub = (mt, entry)
        elif mt > last + 60:
            local_hits.append(entry)

    if newest_pub[0] > last + 60:
        age_h = int((newest_pub[0] - last) / 3600)
        print(
            f"⚠️ {newest_pub[1]} changed after the last publish ({age_h}h ago) — "
            "run publish.sh to sync real-agent-setup."
        )
    elif allow is None:
        print("⚠️ .publish-allowlist unreadable — cannot tell what would ship; treating all as drift.")
    else:
        print("✅ Published tools in sync — nothing on the allowlist needs publishing.")
    if local_hits:
        shown = ", ".join(sorted(local_hits)[:3])
        more = f" (+{len(local_hits) - 3} more)" if len(local_hits) > 3 else ""
        print(f"ℹ️ Local-only, not in .publish-allowlist (no sync needed): {shown}{more}.")
    return True


# Release hygiene for the capsule repo: VERSION + CHANGELOG.md are the single
# source of truth and every release carries a matching annotated tag (see the
# README "Versioning & releases"). ``publish.sh`` intentionally does NOT couple a
# publish run to a release, so nothing else would ever notice that the tag has
# fallen behind — this check is that signal (it once sat 27 commits and five
# weeks behind v1.1.6). Local only: it never contacts the remote.
CAPSULE_REPO = os.path.join(HOME, "real-agent-setup")
TAG_DRIFT_MIN_COMMITS = 10
TAG_DRIFT_MAX_DAYS = 30


def check_release_drift():
    """Remind (never block) that the capsule release tag may be lagging.

    Warns on volume (>= TAG_DRIFT_MIN_COMMITS commits since the newest tag) or
    on age (>= TAG_DRIFT_MAX_DAYS since the tagged commit), and on a mismatch
    between the VERSION file and that tag (VERSION ahead = release in progress).
    """
    print(f"🏷️ Checking release drift for {os.path.relpath(CAPSULE_REPO, HOME)} ...")
    if not os.path.isdir(os.path.join(CAPSULE_REPO, ".git")):
        print("✅ No capsule git repo, skipping.")
        return True

    tag = run_command(f"git -C '{CAPSULE_REPO}' describe --tags --abbrev=0")
    if not tag or tag.startswith("Error:") or "fatal" in tag:
        print("ℹ️ No release tag in the capsule repo yet — nothing to compare against.")
        return True

    count_raw = run_command(f"git -C '{CAPSULE_REPO}' rev-list --count '{tag}..HEAD'")
    try:
        commits = int(count_raw)
    except ValueError:
        print("⚠️ Could not count the commits since the last tag — check skipped.")
        return True

    version = ""
    version_file = os.path.join(CAPSULE_REPO, "VERSION")
    if os.path.isfile(version_file):
        with open(version_file) as f:
            version = f.read().strip()

    days = 0
    tag_date = run_command(f"git -C '{CAPSULE_REPO}' log -1 --format=%cs '{tag}'")
    try:
        days = (datetime.now() - datetime.strptime(tag_date[:10], "%Y-%m-%d")).days
    except ValueError:
        days = 0

    reminders = []
    if version and f"v{version}" != tag:
        reminders.append(
            f"VERSION says {version} but the newest tag is {tag} — finish the release "
            "or bring VERSION back in line (README 'Versioning & releases')."
        )
    if commits >= TAG_DRIFT_MIN_COMMITS or days >= TAG_DRIFT_MAX_DAYS:
        reminders.append(
            f"{commits} commit(s) since {tag} ({days}d ago) — consider cutting a release: "
            "VERSION + CHANGELOG.md, then `git tag -a` and `gh release create`."
        )

    for reminder in reminders:
        print(f"⚠️ {reminder}")
    if not reminders:
        print(f"✅ Release tag {tag} is current ({commits} commit(s) since, tag {days}d old).")
    return True


# Mandate files measured against the Context Efficiency budget. The NL runtime
# file (~/BRAIN/AGENTS.md) is the single source of the threshold; the English
# capsule copy is measured against the same norm. ~/.gemini/GEMINI.md is
# reported informationally only (owner decision: keep it untouched for now).
MANDATE_FILES = [
    os.path.join(BRAIN, "AGENTS.md"),
    os.path.join(HOME, "real-agent-setup", "system-brain", "AGENTS.md"),
]
MANDATE_INFO_ONLY = [os.path.join(HOME, ".gemini", "GEMINI.md")]
CONTEXT_BUDGET_FALLBACK = 3333


def check_context_budget(files=None, norm=None):
    """Measure the mandate files against the Context Efficiency budget.

    Non-blocking by design: an over-budget mandate file prints a warning but
    never fails the hook — trimming the file (or displacing an old mandate when
    adding a new one) is a human decision. The norm itself is read from the
    "Context Efficiency" line in BRAIN/AGENTS.md (one fact, one owner).
    """
    budget_source = "hardcoded fallback"
    if norm is None:
        try:
            with open(os.path.join(BRAIN, "AGENTS.md")) as f:
                # The template labels the row "Context budget", the live mandate
                # "Context Efficiency" — accept either, otherwise a fresh install
                # silently falls back to the hardcoded number.
                m = re.search(
                    r"(?:Context Efficiency|Context budget)[^\n]*?(\d{3,5})\s*\*{0,2}\s*tokens",
                    f.read(),
                )
            if m:
                norm = int(m.group(1))
                budget_source = "BRAIN/AGENTS.md (Context Efficiency line)"
        except OSError:
            pass
        if norm is None:
            norm = CONTEXT_BUDGET_FALLBACK
            print(f"⚠️ Could not read the context budget from BRAIN/AGENTS.md — using fallback {norm}.")

    to_measure = files if files is not None else MANDATE_FILES
    print(f"📏 Checking mandate context budget: {norm} tokens (source: {budget_source}) ...")

    for path in to_measure:
        rel = os.path.relpath(path, HOME)
        if not os.path.isfile(path):
            print(f"ℹ️ {rel}: not present, skipped.")
            continue
        out = run_command(f"{os.path.join(BIN_MACCHA, 'count-tokens')} '{path}'")
        m = re.match(r"\s*(\d+)", out or "")
        if not m:
            print(f"⚠️ {rel}: token count unavailable ({(out or '')[:60]}) — skipped.")
            continue
        n = int(m.group(1))
        if n > norm:
            print(
                f"⚠️ {rel}: {n}/{norm} tokens — over budget. Trim the mandate file, "
                "or displace an older mandate before adding a new one."
            )
        else:
            print(f"✅ {rel}: {n}/{norm} tokens ({norm - n} free).")

    if files is None:
        for path in MANDATE_INFO_ONLY:
            if not os.path.isfile(path):
                continue
            rel = os.path.relpath(path, HOME)
            out = run_command(f"{os.path.join(BIN_MACCHA, 'count-tokens')} '{path}'")
            m = re.match(r"\s*(\d+)", out or "")
            if not m:
                continue
            n = int(m.group(1))
            state = "over budget" if n > norm else "within budget"
            print(f"ℹ️ {rel}: {n} tokens ({state}) — informational only, not enforced.")
    return True


# Unit = CHARACTERS (len() on a UTF-8 decoded str), not bytes. Keep active TMS
# lines concise (<=300 chars: single next action + link; chronological history
# belongs in the owner dossier). SINGLE source of the limit:
# ~/.config/maccha/tms_line_limit.json — read by ~/bin/maccha/session-startup
# and by the OpenCode plugin ~/.config/opencode/plugins/tms-line-limit.ts.
TMS_LINE_LIMIT_FILE = os.path.expanduser("~/.config/maccha/tms_line_limit.json")
TMS_LINE_LIMIT_DEFAULT = 300


def load_max_tms_line_chars():
    """Read the TMS line limit from its single source file; fall back to the default."""
    try:
        with open(TMS_LINE_LIMIT_FILE, encoding="utf-8") as handle:
            value = int(json.load(handle).get("max_line_chars"))
        return value if value > 0 else TMS_LINE_LIMIT_DEFAULT
    except Exception:
        return TMS_LINE_LIMIT_DEFAULT


MAX_TMS_LINE_CHARS = load_max_tms_line_chars()
MAX_TODO_LINES_WARN = 100


def check_tms_hygiene():
    """Enforce hard line-length limit on todo.md / in-progress.md / backlog.md so
    task lines stay concise pointers instead of mini-dossiers, and warn when
    todo.md grows past MAX_TODO_LINES_WARN lines.
    The limit is in characters (UTF-8 aware); session-startup measures the same unit."""
    print(f"📏 Checking TMS line lengths (max {MAX_TMS_LINE_CHARS} chars per line)...")
    violations = []
    for name in ("todo.md", "in-progress.md", "backlog.md"):
        path = os.path.join(TMS_DIR, name)
        if not os.path.isfile(path):
            continue
        with open(path, "r") as f:
            lines = f.readlines()
        if name == "todo.md" and len(lines) > MAX_TODO_LINES_WARN:
            print(
                f"⚠️ todo.md has {len(lines)} lines (warn threshold {MAX_TODO_LINES_WARN}) — "
                "move parked sub-tasks or history into backlog.md or their PLAN/ or INFO/ dossier."
            )
        for idx, line in enumerate(lines, 1):
            raw = line.rstrip("\n")
            if len(raw) > MAX_TMS_LINE_CHARS:
                preview = raw.strip()[:65]
                violations.append(
                    f"{name}:{idx} is {len(raw)} chars (max {MAX_TMS_LINE_CHARS}): '{preview}...' "
                    "→ move chronological history to the dossier file in INFO/ and keep only the next action + link."
                )
    if violations:
        for v in violations:
            print(f"❌ {v}")
        return False
    print(f"✅ All lines in todo.md, in-progress.md and backlog.md are ≤{MAX_TMS_LINE_CHARS} chars.")
    return True


def check_situatie_status_leak():
    """Warn if the central situation overview contains task status symbols (✅⏳❌🔴⛔🟡).
    Non-blocking reminder so weaker models rewrite status ticks into plain facts."""
    checker = os.path.join(BIN_MACCHA, "situation_staleness_check.py")
    if not os.path.isfile(checker):
        return True
    out = run_command(f"python3 '{checker}'")
    if "status-symbool" in out:
        print("⚠️ Central situation overview contains task status symbols (✅/⏳/⛔) — rewrite them as plain state facts:")
        for line in out.splitlines():
            if line.strip().startswith(("✅", "⏳", "❌", "🔴", "⛔", "🟡")):
                print("   " + line.strip())
    return True


def main():
    print(f"🛡️ TMS Integrity Hook - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    tms_content = get_tms_content()

    git_ok = check_git_activity(tms_content)
    workspace_ok = check_workspace_activity(tms_content)
    hygiene_ok = check_tms_hygiene()
    lessons_ok = check_learned_lessons_integrity()
    index_ok = check_index_coverage()
    guardrails_ok = check_guardrails()
    archive_ok = check_archive_retention()
    budget_ok = check_context_budget()
    publish_ok = check_publish_drift()
    release_ok = check_release_drift()
    check_situatie_status_leak()

    if git_ok and workspace_ok and hygiene_ok and lessons_ok and index_ok and guardrails_ok and archive_ok and budget_ok and publish_ok and release_ok:
        print("\n🟢 TMS is CLEAN AND UPTODATE. All activities registered.")
        exit(0)
    else:
        print("\n🔴 TMS DISCREPANCY DETECTED. Please update your logs before finishing.")
        exit(1)


if __name__ == "__main__":
    main()
