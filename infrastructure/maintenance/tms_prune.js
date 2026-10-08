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
const ARCHIVE_DIR = path.join(os.homedir(), 'BRAIN', 'archive', 'tms');

const MAX_DONE_LINES = 100;
const KEEP_LINES = 50;

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

pruneDone();
