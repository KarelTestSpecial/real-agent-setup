const fs = require('fs');
const path = require('path');
const os = require('os');

// Per AGENTS.md rule 1.b: done.md is archived per quarter to
// BRAIN/archive/tms/<year>-Q<x>.md. Physical paths under BRAIN/ (no symlinks).
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

function pruneDone() {
    if (!fs.existsSync(DONE_PATH)) return;

    const lines = fs.readFileSync(DONE_PATH, 'utf8').split('\n');
    if (lines.length <= MAX_DONE_LINES) {
        console.log(`TMS Hygiene: done.md is ${lines.length} lines (limit ${MAX_DONE_LINES}), no prune needed.`);
        return;
    }

    const toArchive = lines.slice(0, lines.length - KEEP_LINES);
    const toKeep = lines.slice(lines.length - KEEP_LINES);
    const archivePath = quarterFile();

    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    const header = `\n\n## --- Archived from done.md on ${new Date().toISOString().split('T')[0]} ---\n`;
    fs.appendFileSync(archivePath, header + toArchive.join('\n') + '\n');
    fs.writeFileSync(DONE_PATH, toKeep.join('\n').trim() + '\n');

    console.log(`TMS Hygiene: ${toArchive.length} lines moved to ${archivePath}.`);
}

pruneDone();
