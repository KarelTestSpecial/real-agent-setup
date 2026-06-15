/**
 * 🛠️ MACCHA Infrastructure: Storage Manager (v2.0 Status & Terminology Fix)
 * 
 * PURPOSE:
 * Standalone diagnostic tool that links disk usage to professional status.
 * 
 * TERMINOLOGY (Fixed to match project standards):
 * - 💧 HYDRATED: Dependencies (node_modules/.venv) ARE present.
 * - 🌵 DORMANT:  Dependencies ARE NOT present (Space saved).
 *
 * NEW in v1.4:
 * - Terminology Alignment: Corrected 'Hydrated' vs 'Dormant' meanings.
 * - Core Protection: Identifies 'real-agent' as a critical CORE agent.
 * - Deep Dive: Detects 'archive' folders (e.g., in real-agent) as cleanup targets.
 *
 * USAGE:
 * storage-manager --report
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOME = process.env.HOME;
const STATE_PATH = path.join(HOME, 'real-agent/rapportage/STATE.md');

const ROOTS = [
    { path: path.join(HOME, 'real-agent'), label: 'Core Agent' },
    { path: path.join(HOME, 'workspace'), label: 'Workspace' }
];

const IMPORTANT_PATHS = [
    { path: path.join(HOME, '1-IT'), label: 'IT Assets' },
    { path: path.join(HOME, 'G_A'), label: 'Agents Root' },
    { path: path.join(HOME, 'workspace'), label: 'Active Work' },
    { path: path.join(HOME, '.npm'), label: 'NPM Cache' },
    { path: path.join(HOME, '.pnpm'), label: 'PNPM Store' },
    { path: path.join(HOME, '.cache'), label: 'System Cache' }
];

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help')) {
        showHelp();
        return;
    }

    if (args.includes('--gc')) { await runGitMaintenance(); return; }
    if (args.includes('--report')) { await professionalReport(); return; }
    if (args.includes('--audit')) { await auditSystem(); return; }
    if (args.includes('--large-files')) { await findLargeFiles(); return; }
    if (args.includes('--prune-all')) { await pruneSystem(); return; }
    
    if (args.includes('--scan')) {
        const target = args[args.indexOf('--scan') + 1] || HOME;
        await deepScan(target);
        return;
    }

    if (args.includes('--prune')) {
        const target = args[args.indexOf('--prune') + 1];
        const dryRun = args.includes('--dry-run');
        if (!target) return console.error('❌ Error: Missing target path for prune.');
        await prunePath(target, dryRun);
        return;
    }
    
    showHelp();
}

function showHelp() {
    console.log(`
  MACCHA Storage Manager (v2.0)
  ----------------------------
 Commands:
   --report            FULL Professional Status Report (Links PRs to Folders).
   --audit             Quick overview of system disk usage.
   --scan [path]       Detailed breakdown of a specific directory for bloat.
   --gc                Runs 'git gc --prune=now' on projects with >500MB .git.
   --prune <path>      Removes node_modules and build artifacts from path.
   --dry-run           Use with --prune to see what would be removed.
   --large-files       Lists 20 largest files (>50MB).
   --prune-all         Global cleanup (pnpm store).

 Terminology:
   💧 HYDRATED = Dependencies (node_modules/.venv) present.
   🌵 DORMANT  = Dependencies removed to save space.
    `);
}

async function professionalReport() {
    console.log('📊 --- MACCHA Professional Storage Report ---');
    const activeProjects = getActiveProjectsFromState();
    const openPRs = getOpenPRs();
    const results = [];

    for (const root of ROOTS) {
        if (!fs.existsSync(root.path)) continue;
        const items = fs.readdirSync(root.path).filter(f => 
            fs.statSync(path.join(root.path, f)).isDirectory() && !f.startsWith('.')
        );

        for (const item of items) {
            const p = path.join(root.path, item);
            const total = getDirSize(p);
            const bloat = getDirSize(path.join(p, 'node_modules')) + getDirSize(path.join(p, '.venv'));
            const git = getDirSize(path.join(p, '.git'));
            const archive = getDirSize(path.join(p, 'archive'));
            
            const hasOpenPR = openPRs.some(pr => {
                if (!pr.repo) return false;
                const repoName = pr.repo.split('/')[1] || '';
                return pr.repo.includes(item) || item.includes(repoName);
            });
            const isFocus = activeProjects.some(ap => item.toLowerCase().includes(ap.toLowerCase()));
            const isCore = ['real-agent'].includes(item.toLowerCase());

            let status = '⚪ IDLE';
            let action = (bloat > 10) ? '💧 HYDRATED' : '🌵 DORMANT';

            if (isCore) { status = '💎 CORE AGENT'; action = '🔥 KEEP (Critical)'; }
            else if (hasOpenPR) { status = '🕒 PENDING PR'; action = '💎 KEEP (Active PR)'; }
            else if (isFocus) { status = '🚀 ACTIVE FOCUS'; action = '💧 KEEP (Working)'; }
            else if (bloat > 10) { action = '🌵 PRUNABLE'; }

            results.push({ 
                Project: item, 
                Total_MB: total, 
                Bloat_MB: bloat, 
                Git_MB: git,
                Arch_MB: archive,
                Status: status, 
                Recommended: action 
            });
        }
    }
    results.sort((a, b) => b.Total_MB - a.Total_MB);
    console.table(results);
    console.log('\n🧠 --- Special Investigation ---');
    checkSpecialFiles();
}

async function runGitMaintenance() {
    console.log('🧹 Starting Git Maintenance (gc --prune=now)...');
    let totalOptimized = 0;
    for (const root of ROOTS) {
        if (!fs.existsSync(root.path)) continue;
        fs.readdirSync(root.path).forEach(item => {
            const dirPath = path.join(root.path, item);
            const gitPath = path.join(dirPath, '.git');
            if (fs.existsSync(gitPath) && getDirSize(gitPath) > 500) {
                console.log(`🚀 Optimizing ${item}...`);
                try { execSync('git gc --prune=now', { cwd: dirPath, stdio: 'inherit' }); totalOptimized++; } catch (e) {}
            }
        });
    }
    console.log(`\n✅ Git maintenance complete. Optimized ${totalOptimized} repositories.`);
}

async function prunePath(targetPath, dryRun = false) {
    const absPath = path.resolve(targetPath.replace(/^~/, HOME));
    if (!fs.existsSync(absPath)) return console.error(`❌ Path not found: ${absPath}`);
    console.log(`${dryRun ? '🔍 DRY RUN:' : '🌵'} Pruning bloat from: ${absPath}`);
    const targets = ['node_modules', '.venv', 'dist', 'build', 'src/data-temp'];
    let freed = 0;
    for (const t of targets) {
        const p = path.join(absPath, t);
        if (fs.existsSync(p)) {
            const size = getDirSize(p);
            console.log(`  - ${dryRun ? 'Would remove' : 'Removing'} ${t} (${size} MB)...`);
            if (!dryRun) execSync(`rm -rf "${p}"`);
            freed += size;
        }
    }
    console.log(`${dryRun ? '📈 Potential' : '✅'} freed space: ${freed} MB`);
}

async function auditSystem() {
    console.log('📊 --- System Disk Audit ---');
    try {
        console.log(execSync('df -h /').toString());
        for (const dir of IMPORTANT_PATHS) {
            if (fs.existsSync(dir.path)) console.log(`${dir.label.padEnd(15)}: ${getDirSize(dir.path)} MB (${dir.path})`);
        }
    } catch (e) {}
}

async function findLargeFiles() {
    console.log('🔍 Searching for files larger than 50MB...');
    try {
        const output = execSync('find ~ -type f -size +50M -exec du -m {} + | sort -nr | head -n 20').toString();
        const lines = output.trim().split('\n');
        console.table(lines.map(line => {
            const parts = line.split(/\s+/);
            return { Size_MB: parseInt(parts[0]), Path: parts.slice(1).join(' ').replace(HOME, '~') };
        }));
    } catch (e) {}
}

async function deepScan(basePath) {
    const absPath = path.resolve(basePath.replace(/^~/, HOME));
    console.log(`🔍 Deep scanning: ${absPath} ...`);
    const results = [];
    const scanFolders = (dir) => {
        try {
            fs.readdirSync(dir).forEach(file => {
                const fullPath = path.join(dir, file);
                if (fs.lstatSync(fullPath).isDirectory()) {
                    if (['node_modules', '.venv', 'dist', 'build', '.cache', 'data-temp', '.git', 'archive'].includes(file)) {
                        results.push({ path: fullPath, type: file, size: getDirSize(fullPath) });
                    } else if (!file.startsWith('.')) scanFolders(fullPath);
                }
            });
        } catch (e) {}
    };
    scanFolders(absPath);
    results.sort((a, b) => b.size - a.size);
    console.table(results.map(r => ({ Type: r.type, Size_MB: r.size, Path: r.path.replace(HOME, '~') })));
}

async function pruneSystem() {
    console.log('🧹 Starting System Prune...');
    execSync('pnpm store prune', { stdio: 'inherit' });
    console.log('\n✅ System prune complete.');
}

function getActiveProjectsFromState() {
    if (!fs.existsSync(STATE_PATH)) return [];
    return (fs.readFileSync(STATE_PATH, 'utf8').match(/1\.\s\*\*(.*?)\*\*/g) || [])
        .map(m => m.replace(/1\.\s\*\*/, '').replace(/\*\*/, ''));
}

function getOpenPRs() {
    try {
        return JSON.parse(execSync('gh search prs --author "@me" --state open --json repository --limit 50').toString())
            .map(pr => ({ repo: pr.repository.fullName }));
    } catch (e) { return []; }
}

function checkSpecialFiles() {
    const agPath = path.join(HOME, '.gemini/antigravity-browser-profile/OptGuideOnDeviceModel');
    if (fs.existsSync(agPath)) console.log(`🤖 Antigravity Browser Models: ${getDirSize(agPath)} MB (Decision: KEEP)`);
    ROOTS.forEach(root => {
        if (!fs.existsSync(root.path)) return;
        fs.readdirSync(root.path).forEach(item => {
            const gp = path.join(root.path, item, '.git');
            if (fs.existsSync(gp)) {
                const s = getDirSize(gp);
                if (s > 500) console.log(`   - ${item}: ${s} MB (Strategy: git gc)`);
            }
        });
    });
}

function getDirSize(p) {
    if (!fs.existsSync(p)) return 0;
    try { return parseInt(execSync(`du -sm "${p}"`).toString().split('\t')[0]); } catch (e) { return 0; }
}

main();
