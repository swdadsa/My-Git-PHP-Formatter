# Changelog

All notable changes to this project will be documented in this file.

## [1.2.3] - 2026-06-09

### Changed

- Replaced separate D group boolean switches with `dGroupCustomRules.mode` and `dGroupCustomRules.enabledRules`.
- Added a migration fallback so the legacy `dGroupCustomRules.enabled` setting still maps to all D group rules.
- Changed D group custom rules to default to `all`.
- Changed format on save to default to enabled.
- Reordered extension settings so D group mode and enabled rules are grouped together.

## [1.2.2] - 2026-06-05

### Added

- Added `dGroupCustomRules.typeCastSpacing` to normalize PHP type cast spacing in changed ranges.
- Added normalizer smoke tests for operator spacing and type cast spacing edge cases.

### Changed

- Added a second D group rule implementation path for type cast spacing.
- Preserved indentation for leading multiline operators such as `||`.
- Preserved PHP spaceship operator `<=>` as one operator token.

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
