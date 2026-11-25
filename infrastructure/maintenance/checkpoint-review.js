#!/usr/bin/env node
/**
 * checkpoint-review.js — lifecycle of checkpoint blocks in in-progress.md.
 *
 * Checkpoint blocks are NOT tasks: that is why they carry no checkbox and the
 * other TMS tools (tms-expiry-review.js, tms-review-queue.js) never see them.
 * They are compaction safety-nets and are consumed at /closeout (LTAIS,
 * TMS-sync, Event). The cleanup therefore belongs there too.
 *
 * Three states, all explicitly invoked:
 *   (no flag)   --list     print every checkpoint block as a HITL queue
 *   --stale               print only finished / >7d old / >3d unverified blocks
 *   --archive             move ONLY blocks carrying a line
 *                         `- afgehandeld: DD/MM/YYYY` to BRAIN/archive/tms/
 *                         and remove them from in-progress.md.
 *
 * The script never wipes a block that is not explicitly marked handled. The
 * agent sets that marker only AFTER processing the les-kandidaten, moving the
 * "Volgende stap" into the TMS and writing the one-line summary in done.md.
 *
 * Classification is by CONTENT, not by the heading label (a block can be done
 * while its title still lacks AFGEROND — see the VERIFY state):
 *   ✅ AFGEHANDELD  carries `- afgehandeld:` (ready for --archive)
 *   ⚫ AFGEROND     title says AFGEROND/Afgesloten, or a `verouderd:`/`afgehandeld:` marker
 *   🟡 VERIFY       active block older than 3d without a done label — cross-check
 *                   its "Volgende stap" against done.md; the work may be done
 *   🟠 OUD-ACTIEF   active block older than 7d
 *   🟤 ACTIEF       otherwise
 *
 * Before --archive: backup to ~/scratch/ + atomic rename (cf. tms_prune lesson).
 *
 * Flags: --json · --today=DD/MM/YYYY (testing) · --stale · --archive
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const TMS = path.join(os.homedir(), 'BRAIN', 'tms', 'in-progress.md');
const ARCHIVE_DIR = path.join(os.homedir(), 'BRAIN', 'archive', 'tms');
const SCRATCH = path.join(os.homedir(), 'scratch');
const STALE_DAYS = 7;
// An active block older than this may already be handled while the block itself
// was never closed. The tool cannot know that -> VERIFY flag: the agent checks
// the content against done.md.
const VERIFY_DAYS = 3;
const DAY = 1000 * 60 * 60 * 24;

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const staleOnly = argv.includes('--stale');
const doArchive = argv.includes('--archive');
const todayArg = argv.find(a => a.startsWith('--today='));
let TODAY = new Date();
if (todayArg) {
  const [d, m, y] = todayArg.split('=')[1].split('/').map(Number);
  TODAY = new Date(y, (m || 1) - 1, d || 1);
}
const todayLabel = `${TODAY.getDate()}/${TODAY.getMonth() + 1}/${TODAY.getFullYear()}`;

function parseBlocks(content) {
  const lines = content.split('\n');
  const blocks = [];
  let cur = null;
  const close = (end) => { if (cur) { cur.end = end; blocks.push(cur); cur = null; } };

  lines.forEach((raw, i) => {
    const m = raw.match(/^###\s+(Checkpoint|Afgesloten)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[—–-]\s*(.+)$/i);
    if (m) {
      close(i - 1);
      cur = {
        start: i,
        end: lines.length - 1,
        heading: raw,
        kind: m[1],
        // Checkpoint headings use DD/MM/YYYY (cf. tms_verval_...): m[2]=day, m[3]=month.
        date: new Date(+m[4], +m[3] - 1, +m[2]),
        dateLabel: `${m[2]}/${m[3]}/${m[4]}`,
        title: m[5].trim(),
        lines: []
      };
      return;
    }
    if (cur) {
      if (/^#{1,3}\s/.test(raw)) { close(i - 1); return; }
      cur.lines.push(raw);
    }
  });
  close(lines.length - 1);

  return blocks.map(b => {
    const text = b.lines.join('\n');
    const les = b.lines.filter(l => /^\s*-\s*les-kandidaat/i.test(l)).map(l => l.trim());
    const nextLine = b.lines.find(l => /^\s*-\s*Volgende stap:/i.test(l));
    const afgehandeld = /^\s*-\s*afgehandeld\s*:/im.test(text);
    // "verouderd:" = agent note that the content already lives elsewhere
    // (done.md/backlog) while the block itself carries no AFGEROND label.
    const verouderd = /^\s*-\s*verouderd\s*:/im.test(text);
    const done = b.kind.toLowerCase() === 'afgesloten' || /afgerond|afgesloten/gi.test(b.title) || verouderd || afgehandeld;
    const age = Math.floor((TODAY - b.date) / DAY);
    const stale = done || age > STALE_DAYS;
    const verify = !stale && age >= VERIFY_DAYS;
    return {
      ...b, text, les,
      next: nextLine ? nextLine.trim() : '',
      afgehandeld, verouderd, done, age, stale, verify
    };
  });
}

function archive(blocks, content) {
  const ready = blocks.filter(b => b.afgehandeld);
  if (!ready.length) {
    console.log('Checkpoint-archive: no block with "- afgehandeld: DD/MM/YYYY" — nothing moved.');
    return;
  }
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  fs.mkdirSync(SCRATCH, { recursive: true });
  const stamp = `${todayLabel.replace(/\//g, '')}-${Date.now()}`;
  fs.copyFileSync(TMS, path.join(SCRATCH, `in-progress.md.bak-${stamp}`));

  const archiveFile = path.join(ARCHIVE_DIR, `checkpoints_${TODAY.getFullYear()}.md`);
  let append = fs.existsSync(archiveFile) ? '' : `# Checkpoint archive ${TODAY.getFullYear()}\n\n`;
  for (const b of ready) {
    append += `## ${b.dateLabel} — ${b.title}\n\n${b.heading}\n${b.text.trim()}\n\n`;
  }
  fs.appendFileSync(archiveFile, append);

  const drop = new Set();
  for (const b of ready) for (let i = b.start; i <= b.end; i++) drop.add(i);
  const cleaned = content.split('\n').filter((_, i) => !drop.has(i)).join('\n').replace(/\n{3,}/g, '\n\n');
  const tmp = `${TMS}.tmp`;
  fs.writeFileSync(tmp, cleaned);
  fs.renameSync(tmp, TMS);

  console.log(`Checkpoint-archive: ${ready.length} block(s) moved → ${archiveFile}`);
  console.log(`Backup: ${path.join(SCRATCH, `in-progress.md.bak-${stamp}`)}`);
}

function badge(b) {
  if (b.afgehandeld) return '✅ HANDLED';
  if (b.done) return '⚫ DONE';
  if (b.verify) return '🟡 VERIFY';
  if (b.age > STALE_DAYS) return '🟠 OLD-ACTIVE';
  return '🟤 ACTIVE';
}

function report(blocks) {
  const stale = blocks.filter(b => b.stale);
  const verify = blocks.filter(b => b.verify);
  const shown = staleOnly ? [...stale, ...verify] : blocks;
  if (asJson) {
    console.log(JSON.stringify({
      today: todayLabel, total: blocks.length,
      stale: stale.length, verify: verify.length,
      items: shown.map(b => ({
        title: b.title, date: b.dateLabel, age: b.age,
        done: b.done, verify: b.verify, stale: b.stale, afgehandeld: b.afgehandeld,
        lesKandidaten: b.les.length, nextStep: b.next,
        line: b.start + 1
      }))
    }, null, 2));
    return;
  }
  if (!shown.length) {
    console.log(staleOnly
      ? 'Checkpoint-stale: OK — no finished, stale or >3d old active blocks.'
      : 'Checkpoint-review: no checkpoint blocks in in-progress.md.');
    return;
  }
  const kop = staleOnly ? 'Checkpoint-stale' : 'Checkpoint-review';
  console.log(`${kop} — ${shown.length} block(s) (HITL, per block):\n`);
  for (const b of shown) {
    console.log(`${badge(b)} · in-progress.md:${b.start + 1} · ${b.dateLabel} (${b.age}d) · ${b.title}`);
    console.log(`     les-candidates: ${b.les.length}${b.les.length ? ` — ${b.les.join(' | ').slice(0, 160)}` : ''}`);
    console.log(`     handled-marker: ${b.afgehandeld ? 'yes' : 'no'}`);
    if (b.next) console.log(`     ${b.next.slice(0, 200)}`);
  }
  if (verify.length) {
    console.log('\n🟡 VERIFY = active block older than 3d without a done label. Its content may');
    console.log('   already be in done.md/backlog while the block was never closed. Cross-check');
    console.log('   the "Volgende stap" against done.md; if executed -> `- afgehandeld: DD/MM/YYYY`.');
  }
  console.log('\n→ /closeout: write les-candidates (LTAIS), move "Volgende stap" into the TMS,');
  console.log('   add a one-line summary in done.md, then `- afgehandeld: DD/MM/YYYY` in the block');
  console.log('   and `checkpoint-review.js --archive`. Never wipe without that marker.');
}

if (!fs.existsSync(TMS)) {
  console.error(`Checkpoint-review: ${TMS} not found.`);
  process.exit(1);
}
const content = fs.readFileSync(TMS, 'utf8');
const blocks = parseBlocks(content);
if (doArchive) archive(blocks, content);
else report(blocks);
process.exit(0);