# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2026-09-13
### Changed
- Hard PII gate now scans **all tracked files** (`git ls-files`) instead of only the synced folders, closing the blind spot that let a tracked config backup leak.
- Sanitization and `LOCAL-ONLY` stripping now also cover `.md`, `.json`, `.yaml` and `.yml` files.
- `publish.sh` copy step now fails loudly on errors (removed the silent `2>/dev/null || true`) and guards missing/empty source directories.
### Fixed
- Corrected the public PII lesson's example path (`/home/someone/` → `/home/<name>/`) and documented the synced-scope pitfall.
### Security
- Variant-proof publish-config ignores; broader sanitization rules (surname + workplace domain) and an enriched local PII wordlist.

## [1.1.0] - 2026-09-13
### Added
- Batched single-call semantic conflict detection in the memory engine (previously one LLM call per existing memory).
- Cooldown-aware `update-pnpm` (respects the 7-day `minimum-release-age`; offers wait / older-version / manual-override options).
### Changed
- `memanto prime` now prints a compact learned-lessons summary (counts + INDEX pointer) instead of the full list, cutting per-session token cost.
- TMS integrity workspace scan now ignores `build/` and `dist/`.
- `publish.sh`: reliable recursive copy (dereference symlinks, always refresh) and gates skip `node_modules/`, `__pycache__/`, `.git/`.
### Removed
- Removed `tms_shortlist_sync` functionality from `session-startup` to streamline the startup checklist.
### Fixed
- Removed personal identifiers from `brain/lib/README.md` and from example usage lines.
### Security
- Purged a mistakenly tracked `.publish-sanitize.sed.backup` and all personal identifiers from the entire git history (commits + tags rewritten); publish sanitization backups are now gitignored.
