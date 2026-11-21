#!/usr/bin/env node
/**
 * tms-review-queue.js — the "one-at-a-time walkthrough" tool (HITL).
 *
 * Motivation (self-evaluation 21/11/2026): TMS hygiene silently piles up
 * problematic lines — expired Sprint items that stay Sprint, 🔥-inflation,
 * tier-mismatch (Ephemeral/Sprint in backlog), near-deadlines without owner.
 * session-startup does not show them coherently. This tool collects ALL
 * problematic categories into one prioritisation, so the agent can walk the
 * queue line by line together with the user and decide per line
 * (extend / split / de-tier / park->backlog / close->done). The tool NEVER
 * acts: it only prints the queue.
 *
 * Categories (each item gets exactly one badge):
 *   🔴 OVERDUE-HARD   deadline < today
 *   🟠 OVERDUE-TIER   created > tier-window
 *   🟡 NEAR           >70% window, or deadline ≤14d
 *   🟣 MISPLACED      tier does not belong in this file
 *                     (todo: Eternal >90d? / backlog: Ephemeral|Sprint)
 *   🔵 FIRE           lone 🔥 without deadline AND older than 21d (🔥-inflation)
 *   ⚪ DUP-TITLE       same **Title** on multiple open lines
 *   🟢 OK             no problem
 *
 * Flags: --json · --today=DD/MM/YYYY (test) · --no-backlog (backlog included by default)
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
const noBacklog = argv.includes('--no-backlog');
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

function scanFile(file) {
  if (!fs.existsSync(file)) return [];
  const base = path.basename(file);
  const isBacklog = base === 'backlog.md';
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const rows = [];
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line.startsWith('- [ ]')) return;
    const tier = tierOf(line);
    if (!tier) return;
    const tm = line.match(/\*\*(.+?)\*\*/);
    const title = tm ? tm[1] : line.slice(0, 60);
    const logged = parseLogged(line);
    const age = logged ? ageDays(logged) : null;
    const deadlines = parseDeadlines(line);
    const hasFire = line.includes('🔥');

    let badge = '🟢 OK';
    const reasons = [];

    // Backlog = parked (>30d horizon): tier-age-decay does NOT apply here
    // (a parked item IS old). Only tier-mismatch + dead-deadline + dupe.
    if (isBacklog) {
      const pastDl = deadlines.filter(d => d < TODAY).sort((a,b)=>a-b)[0];
      if (pastDl) {
        badge = '🔴 OVERDUE-HARD';
        reasons.push(`deadline ${pastDl.getDate()}/${pastDl.getMonth()+1} passed (${ageDays(pastDl)}d ago) — parked with a dead date`);
      }
      if (tier === 'Ephemeral' || tier === 'Sprint') {
        badge = '🟣 MISPLACED';
        reasons.push(`${tier} does not belong in backlog (move to todo or done)`);
      }
      // 🔥 in backlog = meaningless (fire = now-action); note as FIRE.
      if (hasFire && badge === '🟢 OK') {
        badge = '🔵 FIRE';
        reasons.push('🔥 in backlog (fire belongs in todo, not with parked items)');
      }
      rows.push({ file: base, line: i+1, tier, title, badge, age, hasFire, reasons, deadlines: deadlines.length });
      return;
    }

    // todo.md / in-progress.md: full tier-decay
    const pastDl = deadlines.filter(d => d < TODAY).sort((a,b)=>a-b)[0];
    if (pastDl) {
      badge = '🔴 OVERDUE-HARD';
      reasons.push(`deadline ${pastDl.getDate()}/${pastDl.getMonth()+1} passed (${ageDays(pastDl)}d ago)`);
    } else {
      const soon = deadlines.filter(d => { const a = ageDays(d); return a >= 0 && a <= 14; }).sort((a,b)=>a-b)[0];
      const win = WINDOW[tier];
      if (soon && badge === '🟢 OK') {
        badge = '🟡 NEAR';
        reasons.push(`deadline ${soon.getDate()}/${soon.getMonth()+1} in ${ageDays(soon)}d`);
      }
      if (logged && win !== Infinity && age > win && badge === '🟢 OK') {
        badge = '🟠 OVERDUE-TIER';
        reasons.push(`${age}d > ${tier}-window ${win}d`);
      } else if (logged && win !== Infinity && age > win*0.7 && badge === '🟢 OK') {
        badge = '🟡 NEAR';
        reasons.push(`${age}d (window ${win}d)`);
      }
    }

    // misplaced: Sprint/Strategic >30d in todo → backlog-candidate
    if (base === 'todo.md' && age != null && age > 30 && tier !== 'Eternal') {
      badge = '🟣 MISPLACED';
      reasons.push(`${tier} ${age}d old → backlog candidate`);
    }

    // fire without deadline, old → fire-inflation candidate
    if (hasFire && deadlines.length === 0 && age != null && age > 21 && badge === '🟢 OK') {
      badge = '🔵 FIRE';
      reasons.push(`🔥 without deadline, ${age}d old`);
    }

    rows.push({ file: base, line: i+1, tier, title, badge, age, hasFire, reasons, deadlines: deadlines.length });
  });
  return rows;
}

// DUP-TITLE detection across all open lines together
function markDups(all) {
  const byTitle = {};
  for (const r of all) {
    const key = r.title.toLowerCase().replace(/\s+/g,' ').trim();
    (byTitle[key] = byTitle[key] || []).push(r);
  }
  for (const group of Object.values(byTitle)) {
    if (group.length > 1) {
      for (const r of group) {
        if (r.badge === '🟢 OK') r.badge = '⚪ DUP-TITLE';
        r.reasons.push(`same title as ${group.length-1} other line(s)`);
      }
    }
  }
}

const files = [path.join(TMS_DIR,'todo.md'), path.join(TMS_DIR,'in-progress.md')];
if (!noBacklog) files.push(path.join(TMS_DIR,'backlog.md'));

let all = [];
for (const f of files) all = all.concat(scanFile(f));
markDups(all);

const rank = { '🔴 OVERDUE-HARD':0,'🟠 OVERDUE-TIER':1,'🟣 MISPLACED':2,'🟡 NEAR':3,'🔵 FIRE':4,'⚪ DUP-TITLE':5,'🟢 OK':6 };
all.sort((a,b) => (rank[a.badge]-rank[b.badge]) || ((b.age||0)-(a.age||0)));

const flagged = all.filter(r => r.badge !== '🟢 OK');

if (asJson) {
  console.log(JSON.stringify({ today: TODAY.toISOString().slice(0,10), total: all.length, flagged: flagged.length, items: flagged }, null, 2));
} else if (flagged.length === 0) {
  console.log('TMS review-queue: OK — no problematic lines.');
} else {
  console.log(`TMS review-queue — ${flagged.length} line(s) to walk through together (HITL, one-by-one):\n`);
  for (const r of flagged) {
    const suffix = r.age != null ? ` [${r.age}d]` : '';
    console.log(`${r.badge} ${r.file}:${r.line}${suffix} · [${r.tier}] ${r.title}`);
    if (r.reasons.length) console.log(`     └ ${r.reasons.join(' · ')}`);
  }
  console.log('\n→ Desk approach: the agent lays out each line, the user decides per line:');
  console.log('   extend (update date) · split · de-tier · park→backlog · close→done. Never auto.');
}
process.exit(0);