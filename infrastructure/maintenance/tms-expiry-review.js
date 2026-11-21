#!/usr/bin/env node
/**
 * tms-expiry-review.js — detect expired / near-expiry TMS tasks and present
 * them as a HITL review queue. NEVER auto-acts: it only prints the list; the
 * agent puts each item to the user, the user decides per task
 * (extend / remove -> done.md / park -> backlog.md), the agent applies it.
 *
 * Date format in a TMS line:
 *   `(DD/MM)`              = created / last reviewed (freshness vs tier window)
 *   `deadline DD/MM[/YYYY]` = hard external date
 * Without `deadline` -> tier window only (Ephemeral 7d · Sprint 21d · Strategic 90d).
 *
 * Verdicts:
 *   OVERDUE-HARD  deadline < today
 *   OVERDUE-TIER  created > tier window
 *   NEAR          created > 70% of window, or deadline within 14 days
 *   OK            otherwise
 *
 * Flags: --json (machine-readable) · --today=DD/MM/YYYY (testing) · --include-backlog
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const TMS_DIR = path.join(os.homedir(), 'BRAIN', 'tms');
const MONTHS = { jan:0,feb:1,mrt:2,mar:2,apr:3,may:4,mei:4,jun:5,jul:6,aug:7,sep:8,okt:9,oct:9,nov:10,dec:11 };
const WINDOW = { Ephemeral:7, Sprint:21, Strategic:90, Eternal:Infinity };
const DAY = 1000*60*60*24;

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const includeBacklog = argv.includes('--include-backlog');
const todayArg = argv.find(a => a.startsWith('--today='));
let TODAY = new Date();
if (todayArg) {
  const [d,m,y] = todayArg.split('=')[1].split('/').map(Number);
  TODAY = new Date(y, (m||1)-1, d||1);
}
const NOW_YEAR = TODAY.getFullYear();
const ageDays = d => Math.floor((TODAY - d) / DAY);

function tierOf(line) {
  if (line.includes('[Ephemeral]')) return 'Ephemeral';
  if (line.includes('[Sprint]')) return 'Sprint';
  if (line.includes('[Strategic]')) return 'Strategic';
  if (line.includes('[Eternal]')) return 'Eternal';
  return null;
}

function parseLogged(line) {
  const m = [...line.matchAll(/\((\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\)/g)];
  if (!m.length) return null;
  const g = m[0];
  const d = new Date(g[3] ? +g[3] : NOW_YEAR, +g[2]-1, +g[1]);
  return isNaN(d) ? null : d;
}

function parseDeadlines(line) {
  const out = [];
  const re = /\bdeadline\s*[:\s]*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/gi;
  let m;
  while ((m = re.exec(line))) {
    const d = new Date(m[3] ? +m[3] : NOW_YEAR, +m[2]-1, +m[1]);
    if (!isNaN(d)) out.push(d);
  }
  return out;
}

function verdictFor(line, tier) {
  const logged = parseLogged(line);
  const deadlines = parseDeadlines(line);
  const age = logged ? ageDays(logged) : null;

  const pastDl = deadlines.filter(d => d < TODAY).sort((a,b)=>a-b)[0];
  if (pastDl) return { verdict:'OVERDUE-HARD', reason:`deadline ${pastDl.getDate()}/${pastDl.getMonth()+1} passed (${ageDays(pastDl)}d ago)`, age, deadlines };

  const soon = deadlines.filter(d => { const a = ageDays(d); return a >= 0 && a <= 14; }).sort((a,b)=>a-b)[0];
  const win = WINDOW[tier];
  if (soon) return { verdict:'NEAR', reason:`deadline ${soon.getDate()}/${soon.getMonth()+1} in ${ageDays(soon)}d`, age, deadlines };

  if (logged && win !== Infinity && age > win) return { verdict:'OVERDUE-TIER', reason:`logged ${age}d > ${tier} window ${win}d`, age, deadlines };
  if (logged && win !== Infinity && age > win * 0.7) return { verdict:'NEAR', reason:`logged ${age}d (window ${win}d)`, age, deadlines };

  return { verdict:'OK', reason: logged ? `logged ${age}d ago` : 'no date', age, deadlines };
}

function scanFile(file) {
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const rows = [];
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line.startsWith('- [ ]')) return;
    const tier = tierOf(line);
    if (!tier) return;
    const tm = line.match(/\*\*(.+?)\*\*/);
    const title = tm ? tm[1] : line.slice(0, 60);
    const v = verdictFor(line, tier);
    rows.push({ file: path.basename(file), line: i+1, tier, title, ...v });
  });
  return rows;
}

const files = [path.join(TMS_DIR,'todo.md'), path.join(TMS_DIR,'in-progress.md')];
if (includeBacklog) files.push(path.join(TMS_DIR,'backlog.md'));

let all = [];
for (const f of files) all = all.concat(scanFile(f));

const rank = { 'OVERDUE-HARD':0, 'OVERDUE-TIER':1, 'NEAR':2, 'OK':3 };
all.sort((a,b) => (rank[a.verdict]-rank[b.verdict]) || ((b.age||0)-(a.age||0)));

const flagged = all.filter(r => r.verdict !== 'OK');

if (asJson) {
  console.log(JSON.stringify({ today: TODAY.toISOString().slice(0,10), total: all.length, flagged: flagged.length, items: flagged }, null, 2));
} else if (flagged.length === 0) {
  console.log('TMS expiry-review: OK — no expired/near-expiry [Ephemeral]/[Sprint]/[Strategic] tasks in todo.md + in-progress.md.');
} else {
  const label = { 'OVERDUE-HARD':'🔴 OVERDUE (deadline)', 'OVERDUE-TIER':'🟠 OVER TIER', 'NEAR':'🟡 NEAR' };
  console.log(`TMS expiry-review — ${flagged.length} task(s) to review (HITL: extend / remove->done / park->backlog):\n`);
  for (const r of flagged) {
    const datum = r.age != null ? `, logged ${r.age}d ago` : '';
    console.log(`${label[r.verdict]} · ${r.file}:${r.line} · [${r.tier}]${datum} — ${r.reason}`);
    console.log(`   «${r.title}»`);
  }
  console.log('\n→ Put each item to the user one by one; the user decides. Apply afterwards (never auto).');
}
process.exit(0);