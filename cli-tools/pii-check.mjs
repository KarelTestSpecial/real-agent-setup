#!/usr/bin/env node
/**
 * pii-check.mjs — gate for every push: scans what git would add for PII and secrets.
 *
 * Usage:
 *   node ~/bin/maccha/pii-check.mjs --staged            # pre-commit: scan the index
 *   node ~/bin/maccha/pii-check.mjs --staged --cached   # alias
 *   node ~/bin/maccha/pii-check.mjs <path> [<path> ...] # loose files/dirs
 *   node ~/bin/maccha/pii-check.mjs --staged --warn-as-ok
 *
 * Exit 0 = clean, 1 = one or more BLOCK hits (do not push), 2 = usage error.
 *
 * Logic and PII are kept apart: the rules below are generic (secrets, IBAN,
 * national registry number, GSM, e-mail, paths). Your own sensitive terms (names,
 * institutions, conditions) live in ~/.config/maccha/pii-words.json — see
 * pii-words.example.json for the format. That is what keeps this file itself
 * publishable: the PII never travels along. Override the path: PII_WORDS_FILE=<path>.
 *
 * Design principles (cf. AGENTS.md section 2 Scaffolding & PII):
 *  - **Blocking is the default.** A borderline case is not let through to be
 *    judged later; you release it explicitly with a documented pragma.
 *  - Every exemption is traceable: `# pii-ok: <reason>` on the line itself, or a
 *    line in `.piiignore` with the reason. That way an audit shows who released
 *    what, and why.
 *  - Secrets always block, even in a private repo.
 *  - Symlinks pointing outside the repo (e.g. `data/` -> `~/INFO/...`) are
 *    reported separately: they leak nothing as long as nothing dereferences
 *    them, but the first time a tool does, your full personal folder is on GitHub.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const STAGED = argv.includes('--staged') || argv.includes('--cached');
const WARN_AS_OK = argv.includes('--warn-as-ok');
const paths = argv.filter((a) => !a.startsWith('--'));

/** Gitignore-like: small projects have none, so globs with a * star are supported. */
const globToRe = (g) => new RegExp('^' + g
  .split('/').map((seg) => (seg === '**' ? '.*' : seg.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')))
  .join('/')
  .replace(/\/\.\*/g, '(?:/.*)?') + '$');

const RULES = [
  // ── Secrets: always blocking ────────────────────────────────────────────────
  { sev: 'BLOCK', cat: 'secret', re: /-----BEGIN[ A-Z]*PRIVATE KEY-----/ },
  { sev: 'BLOCK', cat: 'secret', re: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { sev: 'BLOCK', cat: 'secret', re: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { sev: 'BLOCK', cat: 'secret', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { sev: 'BLOCK', cat: 'secret', re: /\bsk-[A-Za-z0-9]{32,}/ },
  { sev: 'BLOCK', cat: 'secret', re: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
  { sev: 'BLOCK', cat: 'secret', re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { sev: 'BLOCK', cat: 'secret', re: /\b(client_secret|api[_-]?key|private[_-]?key|access[_-]?token|password|passwd|bearer_token)\b\s*[:=]\s*["'][^"']{8,}["']/i },
  { sev: 'BLOCK', cat: 'secret', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },

  // ── Identification (generic) ───────────────────────────────────────────────
  { sev: 'BLOCK', cat: 'identification', re: /\bBE\s?\d{2}[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/ }, // IBAN
  { sev: 'BLOCK', cat: 'identification', re: /\b\d{2}\.\d{2}\.\d{2}[-–]\d{3}\.\d{2}\b/ }, // national registry number
  { sev: 'BLOCK', cat: 'identification', re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ }, // any e-mail address
  { sev: 'BLOCK', cat: 'identification', re: /(\+|00)32[\s.-]?\(?0?\d{1,2}\)?[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{2,3}\b/ },

  // ── Health / justice ────────────────────────────────────────────────────────
  // Personal context terms (own name, institutions, conditions) do NOT belong
  // in this engine: they live in ~/.config/maccha/pii-words.json (see below).

  // ── Personal paths / data-store ────────────────────────────────────────────
  { sev: 'BLOCK', cat: 'personal path', re: /\/home\/[a-z0-9_.-]+\//i },
  { sev: 'BLOCK', cat: 'personal path', re: /\/Users\/[a-z0-9_.-]+\//i },
  { sev: 'BLOCK', cat: 'personal path', re: /\b[A-Z]:\\\\?Users\\\\/i },

  // ── Information indicator (warns, non-blocking) ─────────────────────────────
  { sev: 'WARN', cat: 'assistant identity', re: /\bMACCHA\b|\bmaccha\b/ },
];

// ── Personal word list (local — never publish) ────────────────────────────────
// Without a file the gate runs on the generic rules only; that is always reported
// visibly here, never silently with less scrutiny. An unreadable list is a
// weakened gate and therefore gets a warning.
const PII_WORDS_FILE = process.env.PII_WORDS_FILE
  || path.join(process.env.HOME || '', '.config', 'maccha', 'pii-words.json');
try {
  const raw = JSON.parse(await fs.readFile(PII_WORDS_FILE, 'utf8'));
  let n = 0;
  for (const r of (Array.isArray(raw) ? raw : [])) {
    if (!r || typeof r.pattern !== 'string') continue;
    RULES.push({ sev: r.sev === 'WARN' ? 'WARN' : 'BLOCK', cat: r.cat || 'personal', re: new RegExp(r.pattern, r.flags || '') });
    n++;
  }
  console.log(`🔐 personal word list: ${n} pattern(s) from ${PII_WORDS_FILE}`);
} catch (e) {
  if (e.code === 'ENOENT') {
    console.log(`ℹ️ no personal word list (${PII_WORDS_FILE}) — generic patterns only.`);
  } else {
    console.log(`⚠️ personal word list unreadable (${PII_WORDS_FILE}): ${e.message} — generic patterns only!`);
  }
}

// Projects may add words of their own local context: a tool that matches a search
// term (e.g. a regex matching text) is not personal data.
const ALLOW_CONTEXT = new Set([
  'zoekwoord', // e.g. a regex matching text
]);

const ignore = new Set();
async function loadIgnore(root) {
  try {
    const t = await fs.readFile(path.join(root, '.piiignore'), 'utf8');
    for (const line of t.split('\n')) {
      const s = line.trim();
      if (!s || s.startsWith('#')) continue;
      ignore.add(globToRe(s.split('#')[0].trim()));
    }
  } catch { /* no .piiignore: fine */ }
}

function stagedFiles(root) {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { cwd: root, encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

async function walk(root, rel, acc) {
  // resolve (not join): an absolute path must not be appended behind `root`.
  const abs = path.resolve(root, rel);
  const st = await fs.lstat(abs);
  if (st.isSymbolicLink()) {
    const target = await fs.readlink(abs);
    acc.links.push({ file: rel, target, buitenRepo: !path.resolve(path.dirname(abs), target).startsWith(path.resolve(root)) });
    return acc;
  }
  if (st.isDirectory()) {
    for (const e of await fs.readdir(abs)) await walk(root, rel ? `${rel}/${e}` : e, acc);
    return acc;
  }
  acc.files.push(rel);
}

const gitTop = (() => {
  try { return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim(); }
  catch { return process.cwd(); }
})();

if (STAGED && !paths.length) {
  try { paths.push(...stagedFiles(gitTop)); }
  catch (e) { console.error('✗ no git index to scan:', e.message); process.exit(2); }
}
if (!paths.length) {
  if (STAGED) {
    // Nothing staged or only deletions: there is nothing to scan.
    console.log('\n🔍 PII-check — nothing staged to check (e.g. only deletions).\n✅ clean — nothing to block.\n');
    process.exit(0);
  }
  console.error('usage: --staged or pass paths');
  process.exit(2);
}

await loadIgnore(gitTop);

const findings = [];
const acc = { files: [], links: [] };
// Absolute paths are resolved here. A path that does not exist is a hard error
// (exit 2) and never a silent "clean" message: otherwise the gate would say
// "nothing to block" while zero files were actually checked.
const missing = [];
for (const p of paths) {
  const abs = path.resolve(p);
  const rel = abs.startsWith(gitTop + path.sep) ? path.relative(gitTop, abs) : abs;
  const exists = await fs.lstat(abs).then(() => true).catch(() => false);
  if (!exists) { missing.push(p); continue; }
  try { await walk(gitTop, rel, acc); }
  catch (e) { console.error(`⚠ could not scan: ${p} (${e.message})`); missing.push(p); }
}
if (missing.length) {
  console.error(`\n✗ path does not exist or is unreadable: ${missing.join(', ')}`);
  console.error('  nothing was checked — this is NOT an approval.\n');
  process.exit(2);
}

for (const rel of acc.files) {
  if ([...ignore].some((re) => re.test(rel))) continue;
  let text;
  try { text = await fs.readFile(path.resolve(gitTop, rel), 'utf8'); } catch { continue; }
  if (text.includes('\0')) continue; // binary
  const lines = text.split('\n');
  for (const rule of RULES) {
    lines.forEach((line, i) => {
      const m = line.match(rule.re);
      if (!m) return;
      const pragma = /#\s*pii-ok\s*:\s*(.+)$/.exec(line);
      const allow = pragma ? pragma[1].trim() : '';
      findings.push({
        sev: allow ? 'OK(pragma)' : rule.sev,
        cat: rule.cat, file: rel, line: i + 1,
        snippet: line.trim().slice(0, 110),
        released: allow || null,
      });
    });
  }
}

for (const l of acc.links) {
  findings.push({
    sev: l.buitenRepo ? 'BLOCK' : 'WARN', cat: 'symlink', file: l.file, line: 0,
    snippet: `→ ${l.target}${l.buitenRepo ? '  (POINTS OUTSIDE THE REPO)' : ''}`,
    released: null,
  });
}

const blocks = findings.filter((f) => f.sev === 'BLOCK' && !(WARN_AS_OK && f.cat !== 'secret'));
const warns = findings.filter((f) => f.sev === 'WARN');

console.log(`\n🔍 PII-check — ${acc.files.length} files · ${acc.links.length} symlinks · ${findings.length} hits\n`);
if (!findings.length) { console.log('✅ clean — nothing to block.\n'); process.exit(0); }

const group = (list, label) => {
  if (!list.length) return;
  console.log(`── ${label} ──`);
  for (const f of list) console.log(`  ${f.sev === 'OK(pragma)' ? '✔' : '•'} [${f.cat}] ${f.file}${f.line ? `:${f.line}` : ''}\n      ${f.snippet}${f.released ? `\n      ↳ released: ${f.released}` : ''}`);
  console.log('');
};
group(findings.filter((f) => f.sev === 'BLOCK'), `BLOCKING (${blocks.length})`);
group(warns, `warnings (${warns.length})`);
group(findings.filter((f) => f.sev === 'OK(pragma)'), `released via pragma (${findings.filter((f) => f.sev === 'OK(pragma)').length})`);

if (blocks.length) {
  console.log(`⛔ ${blocks.length} blocking hit(s) — do not commit/push.`);
  console.log('   Release deliberately with a `# pii-ok: <reason>` on the line, or via .piiignore.\n');
  process.exit(1);
}
console.log('✅ no blocking hits.\n');
