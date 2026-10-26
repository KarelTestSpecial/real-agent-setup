const fs = require('fs');
const path = require('path');
const os = require('os');

// Per AGENTS.md rule 1.b: done.md archives quarterly into
// BRAIN/archive/tms/<year>-Q<x>.md. Literal paths under BRAIN/ (no symlinks).
// done.md is "most recent on top" → archive the OLDEST lines (bottom),
// keep header + newest (top). Old bug: slice(0, len-KEEP) took the
// NEWEST lines instead of the oldest → see lesson tms_prune_archiveert_oudste_regels.
const TMS_DIR = path.join(os.homedir(), 'BRAIN', 'tms');
const DONE_PATH = path.join(TMS_DIR, 'done.md');
const TODO_PATH = path.join(TMS_DIR, 'todo.md');
const IN_PROGRESS_PATH = path.join(TMS_DIR, 'in-progress.md');
const BACKLOG_PATH = path.join(TMS_DIR, 'backlog.md');
const ARCHIVE_DIR = path.join(os.homedir(), 'BRAIN', 'archive', 'tms');

const MAX_DONE_LINES = 100;
const KEEP_LINES = 50;
const MAX_TODO_LINES = 100;
const EPHEMERAL_MAX_DAYS = 7;
const SPRINT_MAX_DAYS = 21;

const MONTHS = {
    jan: 0, feb: 1, mar: 2, mrt: 2, apr: 3, may: 4, mei: 4,
    jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, okt: 9, nov: 10, dec: 11,
};

function quarterFile() {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    return path.join(ARCHIVE_DIR, `${now.getFullYear()}-Q${q}.md`);
}

function findHeaderEnd(lines) {
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trimStart();
        if (t.startsWith('- [ ]') || t.startsWith('- [x]')) return i;
    }
    return 0;
}

function parseTaskDate(line, nowYear) {
    // Match trailing or inline date markers such as (23/10), (23/10/2026), (25 October 2026)
    const slashMatches = [...line.matchAll(/\((\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\)/g)];
    if (slashMatches.length > 0) {
        const m = slashMatches[slashMatches.length - 1];
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10) - 1;
        const year = m[3] ? parseInt(m[3], 10) : nowYear;
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
    }
    const wordMatches = [...line.matchAll(/\((\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\)/gi)];
    if (wordMatches.length > 0) {
        const m = wordMatches[wordMatches.length - 1];
        const day = parseInt(m[1], 10);
        const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
        const year = m[3] ? parseInt(m[3], 10) : nowYear;
        if (month !== undefined) {
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) return d;
        }
    }
    return null;
}

function auditActiveTms() {
    const now = new Date();
    const nowYear = now.getFullYear();

    for (const [label, filePath] of [
        ['todo.md', TODO_PATH],
        ['in-progress.md', IN_PROGRESS_PATH],
        ['backlog.md', BACKLOG_PATH],
    ]) {
        if (!fs.existsSync(filePath)) continue;
        const lines = fs.readFileSync(filePath, 'utf8').split('\n');
        const doneLeft = lines.filter((l) => l.trimStart().startsWith('- [x]')).length;
        if (doneLeft > 0) {
            console.log(`⚠️ TMS Hygiene: ${label} has ${doneLeft} finished [x] item(s) — move to done.md.`);
        }
        if (label === 'todo.md' && lines.length > MAX_TODO_LINES) {
            console.log(`⚠️ TMS Hygiene: todo.md is ${lines.length} lines (budget ${MAX_TODO_LINES}) — move parked items to backlog.md.`);
        }
    }

    if (!fs.existsSync(TODO_PATH)) return;
    const todoLines = fs.readFileSync(TODO_PATH, 'utf8').split('\n');
    const stale = [];
    for (let i = 0; i < todoLines.length; i++) {
        const line = todoLines[i].trimStart();
        if (!line.startsWith('- [ ]')) continue;
        const isEphemeral = line.includes('[Ephemeral]');
        const isSprint = line.includes('[Sprint]');
        if (!isEphemeral && !isSprint) continue;

        const d = parseTaskDate(line, nowYear);
        if (!d) continue;
        const ageDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        const limit = isEphemeral ? EPHEMERAL_MAX_DAYS : SPRINT_MAX_DAYS;
        const tier = isEphemeral ? 'Ephemeral' : 'Sprint';
        if (ageDays > limit) {
            const titleMatch = line.match(/\*\*(.+?)\*\*/);
            const title = titleMatch ? titleMatch[1] : line.slice(0, 60);
            stale.push(`  - L${i + 1} [${tier}, ${ageDays}d > ${limit}d]: ${title}`);
        }
    }
    if (stale.length > 0) {
        console.log(`⚠️ TMS Expiry: ${stale.length} item(s) in todo.md past their tier window (review -> done.md, backlog.md, or refresh date):`);
        stale.forEach((s) => console.log(s));
    } else {
        console.log('TMS Hygiene: all [Ephemeral]/[Sprint] items in todo.md are within their expiry window.');
    }
}

function pruneDone() {
    if (!fs.existsSync(DONE_PATH)) return;

    const lines = fs.readFileSync(DONE_PATH, 'utf8').split('\n');
    if (lines.length <= MAX_DONE_LINES) {
        console.log(`TMS Hygiene: done.md is ${lines.length} lines (limit ${MAX_DONE_LINES}), no prune needed.`);
        return;
    }

    const headerEnd = findHeaderEnd(lines);
    const header = lines.slice(0, headerEnd);
    const content = lines.slice(headerEnd);

    // KEEP_LINES = total lines kept including header (oldest → archive).
    const keepContentCount = Math.max(1, KEEP_LINES - header.length);
    if (content.length <= keepContentCount) {
        console.log('TMS Hygiene: content already within KEEP_LINES, no prune needed.');
        return;
    }

    const toKeepContent = content.slice(0, keepContentCount);
    const toArchive = content.slice(keepContentCount);

    const archivePath = quarterFile();
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    const archiveHeader = `\n\n## --- Archived from done.md on ${new Date().toISOString().split('T')[0]} ---\n`;
    const archiveBody = toArchive.join('\n').replace(/\n+$/, '');
    fs.appendFileSync(archivePath, archiveHeader + archiveBody + '\n');

    const kept = header.concat(toKeepContent).join('\n').replace(/\s+$/, '') + '\n';
    fs.writeFileSync(DONE_PATH, kept);

    console.log(`TMS Hygiene: ${toArchive.length} oldest lines moved to ${archivePath}.`);
}

function pruneImprovement() {
    const impPath = path.join(os.homedir(), 'BRAIN', 'IMPROVEMENT.md');
    const logPath = path.join(os.homedir(), 'BRAIN', 'archive', 'improvement-lessons-log.md');
    const MAX_IMP_LINES = 120;
    if (!fs.existsSync(impPath)) return;

    const lines = fs.readFileSync(impPath, 'utf8').split('\n');
    if (lines.length <= MAX_IMP_LINES) {
        console.log(`TMS Hygiene: IMPROVEMENT.md is ${lines.length} lines (limit ${MAX_IMP_LINES}), no prune needed.`);
        return;
    }

    // Find all session blocks ("### ") and archive the oldest ones
    const blockStarts = [];
    let roadmapIdx = lines.length;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('## 📈 Improvement Roadmap')) {
            roadmapIdx = i;
            break;
        }
        if (lines[i].startsWith('### ')) {
            blockStarts.push(i);
        }
    }

    if (blockStarts.length <= 2) return;

    // Keep the top header + newest 3 session blocks + roadmap footer
    const cutIdx = blockStarts[Math.min(3, blockStarts.length - 1)];
    const toArchive = lines.slice(cutIdx, roadmapIdx);
    if (toArchive.length === 0) return;

    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const stamp = new Date().toISOString().split('T')[0];
    const archiveChunk = `\n\n## --- Auto-archived from IMPROVEMENT.md on ${stamp} ---\n\n` + toArchive.join('\n').trim() + '\n';
    fs.appendFileSync(logPath, archiveChunk);

    const kept = lines.slice(0, cutIdx).concat([''], lines.slice(roadmapIdx)).join('\n').replace(/\s+$/, '') + '\n';
    fs.writeFileSync(impPath, kept);
    console.log(`TMS Hygiene: archived ${toArchive.length} lines from IMPROVEMENT.md to ${logPath}.`);
}

auditActiveTms();
pruneDone();
pruneImprovement();
