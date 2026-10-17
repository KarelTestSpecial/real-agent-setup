#!/usr/bin/env node
// Link check: verify that filesystem paths referenced in knowledge files still exist.
// Guards against "link rot" after folder reorganizations: knowledge files (task lists,
// situation overviews, registers) keep pointing at paths that have moved or been deleted.
//
// Usage: node link-check.cjs <file> [<file> ...]
// Exit codes: 0 = every reference found exists, 1 = at least one broken reference or
// unreadable source file, 2 = no files given. Since 17 Oct 2026 this is a **gate**, not a
// friendly report: it fails loudly so `session-startup` cannot silently skip it.
// A deliberately historical reference gets the `linkcheck-ok` marker on that line — the
// only allowed exemption, and it stays visible in the source, per line.
//
// Deliberate exemptions and refinements (documented because each caused false positives):
//   * `path/to/file.js:123` — a line reference. The `:123` suffix is dropped when the
//     bare path exists, so `search.js:186` verifies `search.js`.
//   * a line containing the marker `linkcheck-ok` is skipped entirely. Use it for text
//     that intentionally names a path which no longer exists (e.g. "the flag
//     BRAIN/.harvest_paused no longer exists" — the sentence is correct, the path is not).
//   * a zone must not start right after a word character: without this, an acronym such
//     as "ABC/XYZ" was read as the path C/XYZ. Relative paths such as "../../../BRAIN/x"
//     still match, because they are preceded by "/".
//
// Capsule copy of the local hook (~/BRAIN/hooks/link-check.cjs): same logic, English text.
// Keep the two in sync when changing behaviour.
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
// Top-level zones whose (home-relative) mentions are resolved and verified.
const ZONES = ['INFO', 'PLAN', 'BRAIN', 'C', 'workspace', 'templates', 'INBOX'];

const files = process.argv.slice(2);
if (files.length === 0) {
  console.log('link-check: no files given (usage: node link-check.cjs <file> [<file> ...])');
  process.exit(2);
}

// Candidate = optional file:// + optional home prefix (absolute or ~) + zone + path.
// Stops at whitespace and common markdown/quote delimiters, so filenames containing
// spaces are matched only up to the first space (handled below via prefix probing).
const PAT = new RegExp(
  `(?<!\\w)(?:file://)?(?:${HOME.replace(/\//g, '\\/')}/|~/)?(?:${ZONES.join('|')})/[^\\s\`"'\\)\\]\\|<>*#]+`,
  'g'
);

const IGNORE_MARKER = 'linkcheck-ok';

let broken = 0;
let unreadable = 0;
let refs = 0;

for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    console.log(`link-check: cannot read ${file}`);
    unreadable++;
    continue;
  }
  const seen = new Set();
  for (const line of text.split('\n')) {
    if (line.includes(IGNORE_MARKER)) continue;
    for (const match of line.matchAll(PAT)) {
      let p = match[0]
        .replace(/^file:\/\//, '')
        .replace(/^~\//, HOME + '/')
        .replace(/[.,;:!?…]+$/, '') // trailing sentence punctuation
        .replace(/\/+$/, '');
      // Knowledge files URL-encode spaces in links as %20. Try both the raw and the
      // decoded path: if neither exists the link is genuinely broken (and a file that
      // is literally named "%20" is not falsely reported).
      const candidates = [p];
      try {
        const dec = decodeURIComponent(p).replace(/[.,;:!?…]+$/, '').replace(/\s+$/, '').replace(/\/+$/, '');
        if (dec !== p) candidates.push(dec);
      } catch { /* invalid %-encoding: keep the raw path only */ }
      p = candidates.find((c) => fs.existsSync(c.startsWith('/') ? c : path.join(HOME, c))) ?? p;
      if (!p.startsWith('/')) p = path.join(HOME, p);
      if (!fs.existsSync(p)) {
        const bare = p.replace(/:\d+(?:-\d+)?$/, '');
        if (bare !== p && fs.existsSync(bare)) p = bare;
      }
      if (seen.has(p)) continue;
      seen.add(p);
      refs++;
      if (fs.existsSync(p)) continue;
      // The regex stops at spaces; if a directory entry starts with the unmatched
      // basename, the real target likely contains spaces — treat as OK.
      const dir = path.dirname(p);
      const base = path.basename(p);
      if (fs.existsSync(dir)) {
        let entries = [];
        try { entries = fs.readdirSync(dir); } catch {}
        if (entries.some((e) => e.startsWith(base))) continue;
      }
      broken++;
      console.log(`⚠️  ${path.basename(file)}: missing ${p.replace(HOME + '/', '~/')}`);
    }
  }
}

if (broken === 0 && unreadable === 0) {
  console.log(`Link check OK (${files.length} file(s), ${refs} reference(s)).`);
  process.exit(0);
}
const reasons = [];
if (broken) reasons.push(`${broken} broken reference(s) — update the source file(s) or restore the target(s)`);
if (unreadable) reasons.push(`${unreadable} unreadable source file(s) — check the path in the hook configuration`);
console.log(`⛔ Link check FAILED: ${reasons.join('; ')} (${files.length} file(s), ${refs} reference(s)).`);
process.exit(1);
