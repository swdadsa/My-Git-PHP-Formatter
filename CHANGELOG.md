# Changelog

All notable changes to this project will be documented in this file.

## [1.2.1] - 2026-04-28

### Added

- Added `dGroupCustomRules.enabled` as a group-level switch for D group custom formatting rules.
- Added `dGroupCustomRules.operatorSpacing` to normalize spacing around common PHP operators in changed ranges.
- Added support for normalizing `=`, `===`, `!==`, `==`, `!=`, `<=`, `>=`, `<`, `>`, `=>`, `??`, `&&`, and `||`.
- Added function-level comments across extension source files to improve maintainability.
- Added `skipMixedHtmlDocuments` to avoid broad formatter changes in mixed PHP/HTML files.

### Changed

- Split the extension implementation into focused modules for commands, git diff parsing, formatting workflow, settings, logging, notifications, and save handling.
- Moved operator spacing behavior into the D group custom rules pipeline.
- Kept formatting scoped to git-changed PHP ranges, while formatting new PHP files as whole documents.

### Removed

- Removed the old `normalizeOperatorSpacing` setting.
- Removed the unused standalone `format-range` CLI.
- Removed generated `.vsix` packages from git tracking and ignored future VSIX artifacts.

## [1.0.0] - 2026-04-23

### Added

- Added initial VS Code extension for formatting changed PHP files from git diff.
- Added commands for formatting all changed PHP files and the current PHP file.
- Added optional format-on-save support.
