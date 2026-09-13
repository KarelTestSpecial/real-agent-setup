# Changelog

All notable changes to this project will be documented in this file.

## [1.1.6] - 2026-09-13
### Added
- `maccha-doctor`: one-shot harness health check (core zones, root symlinks, backup freshness, secret permissions, TMS integrity, supply chain, disk space, optional vdab-swipe/repo checks, broken symlinks). Exit 0 = healthy, 1 = failure.
### Security
- Tightened `~/.config/maccha` and `~/.config/maccha/secrets` to `700` (secret files `600`) after the new doctor flagged overly broad permissions.

## [1.1.5] - 2026-09-13
### Changed
- Bumped the CI checkout action to `actions/checkout@v7` (Node 20 deprecation on GitHub runners).

## [1.1.4] - 2026-09-13
### Added
- GitHub Actions **Gates** workflow: shell/JS/Python syntax checks plus the publish sanitization/PII/language gates (`publish.sh --check-only`) on every push and pull request — a regression net for the public repo.

## [1.1.3] - 2026-09-13
### Fixed
- README accuracy: removed the documented-but-unimplemented `.publish-skip` config (now correctly "two" config files), corrected the `learned-lessons/` description (it ships a curated public mirror, not "never pushed"), and fixed the directory map (dropped the untracked `ALIASES.md`; added `hooks/` and `policies/`).
- `ga-inventory.py` is now executable (it carries a shebang).
### Added
- Documented `publish.sh --check-only` in the publishing guide.

## [1.1.2] - 2026-09-13
### Added
- `publish.sh --check-only`: runs the sanitization + PII + language gates without copying or committing (CI-safe, exit 0 on pass / 1 on leak).
### Changed
- Published lessons mirror updated with the `cp -ru` → `cp -rfL` drift finding.

## [1.1.1] - 2026-09-13
### Changed
- Hard PII gate now scans **all tracked files** (`git ls-files`) instead of only the synced folders, closing the blind spot that let a tracked config backup leak.
- Sanitization and `LOCAL-ONLY` stripping now also cover `.md`, `.json`, `.yaml` and `.yml` files.
- `publish.sh` copy step now fails loudly on errors (removed the silent `2>/dev/null || true`) and guards missing/empty source directories.
### Fixed
- Corrected the public PII lesson's example home path so it no longer resembles a real directory, and documented the synced-scope pitfall.
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
