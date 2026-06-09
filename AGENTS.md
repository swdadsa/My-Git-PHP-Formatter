# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

This repository contains a VS Code extension named **My Git PHP Formatter**.
Its main purpose is to format only the PHP lines changed in `git diff`.
Newly added PHP files are formatted as full documents because there is no
previous baseline for range-based formatting.

The extension is written in TypeScript. Source files live under `src/`, and
compiled JavaScript is emitted to `dist/`.

The extension relies on the active VS Code formatter provider for PHP. For
example, if the user wants Intelephense to handle formatting, they should set
Intelephense as the default PHP formatter in VS Code.

## Repository Layout

- `package.json`: extension manifest, commands, settings, activation events, and npm scripts.
- `tsconfig.json`: TypeScript compiler configuration.
- `README.md`: user-facing extension overview and packaging instructions.
- `CHANGELOG.md`: release notes.
- `LICENSE.txt`: project license.
- `src/extension.ts`: VS Code extension activation entrypoint.
- `src/container.ts`: dependency wiring for services, use cases, and adapters.
- `src/constants.ts`: shared command IDs, setting keys, and extension constants.
- `src/presentation/`: VS Code-facing command handlers and save-event handlers.
- `src/application/customRules/`: D group custom formatting rules and rule registries.
- `src/application/useCases/`: user-facing workflows such as formatting changed files, the current file, or a saved document.
- `src/application/services/`: shared orchestration for formatting workflows.
- `src/application/policies/`: application-level decisions, such as whether a document should be skipped.
- `src/domain/mixedHtml/`: pure rules for detecting mixed PHP/HTML documents.
- `src/domain/operatorSpacing/`: pure scanning and edit-planning logic for PHP operator spacing.
- `src/domain/typeCastSpacing/`: pure scanning and edit-planning logic for PHP type cast spacing.
- `src/domain/types/`: shared TypeScript contracts and data shapes.
- `src/infrastructure/git/`: git diff and repository adapters.
- `src/infrastructure/vscode/`: VS Code document, formatter, edit, and extension API adapters.
- `src/infrastructure/config/`: VS Code configuration reads.
- `src/infrastructure/logging/`: output-channel logging.
- `src/infrastructure/notification/`: user notification adapter.
- `dist/`: generated JavaScript output from `npm run compile`.

## Common Commands

Install dependencies:

```sh
npm install
```

Compile TypeScript:

```sh
npm run compile
```

Watch TypeScript:

```sh
npm run watch
```

Package a VSIX:

```sh
npm run package:vsix
```

Package a pre-release VSIX:

```sh
npm run package:vsix:pre-release
```

Run normalizer smoke tests:

```sh
npm test
```

`npm test` compiles TypeScript first, then runs `scripts/smoke-test-normalizers.js`
against key operator spacing and type cast spacing edge cases.

## Architecture Rules

Keep the existing lightweight layered architecture intact.

Presentation layer:

- Owns VS Code command callbacks and save-event entrypoints.
- Should stay thin.
- Delegates workflow decisions to application use cases.
- May depend on VS Code APIs because it is already at the integration boundary.

Application layer:

- Coordinates workflows.
- Owns user-facing use case behavior.
- Applies policies such as whether a document should be skipped.
- Should depend on domain rules and service contracts, not concrete VS Code or git APIs.

Domain layer:

- Contains pure logic that can be understood without VS Code, git, or filesystem context.
- Domain rule modules should not import `vscode`.
- Shared service/type contracts may reference VS Code types only when they describe integration boundaries.
- Should not read configuration, mutate documents, call git, or show notifications.
- Is the preferred place for parsing, detection, edit planning, and other deterministic rules.

Infrastructure layer:

- Owns concrete adapters for VS Code, git, logging, notifications, and configuration.
- Converts external API details into project service contracts.
- Should not contain domain decisions beyond translating external data into internal types.

Dependency wiring:

- Add new concrete services in `src/container.ts`.
- Prefer constructor injection through existing contracts.
- Keep service interfaces in `src/domain/types/` when they are shared across layers.

D group custom rules:

- Keep D group rule wrappers in `src/application/customRules/dGroup/`.
- Keep pure scanner / edit-planning logic in `src/domain/<ruleName>/`.
- Keep VS Code edit application in `src/infrastructure/vscode/`.
- Wire new D group rules through `DGroupCustomRuleRegistry` in `src/container.ts`.
- Add each rule ID to `D_GROUP_RULE_IDS` in `src/constants.ts`.
- Keep D group selection centralized in `DGroupCustomRuleRegistry`.
- `myGitPhpFormatter.dGroupCustomRules.mode` controls whether D group rules are off, all enabled, or custom-selected.
- `myGitPhpFormatter.dGroupCustomRules.enabledRules` controls which rules run only when mode is `custom`.

## Core Behavior To Preserve

The most important product promise is narrow formatting:

- Format changed PHP ranges from git diff.
- Format newly added PHP files as whole documents.
- Avoid reformatting unrelated lines.
- Avoid unexpected full-document formatting in mixed PHP/HTML templates.
- Keep save-time formatting scoped to the file that was just saved.

Be especially careful when editing range calculation, git diff parsing, document
position mapping, or VS Code formatter calls. Small off-by-one mistakes can
cause unrelated PHP code to be reformatted.

## Mixed PHP/HTML Handling

By default, files that appear to contain substantial HTML markup are skipped.
This is intentional because some VS Code range format providers may still
produce broad edits in mixed template files.

When changing mixed document detection:

- Keep detection rules in `src/domain/mixedHtml/`.
- Keep policy decisions in `src/application/policies/`.
- Avoid coupling detection to VS Code document objects.
- Consider false positives and false negatives. A false negative may cause
  unexpected formatting in templates; a false positive may skip a file the user
  expected to format.

## D Group Custom Rule Normalization

D group custom formatting rules are optional and controlled by
`myGitPhpFormatter.dGroupCustomRules.mode`.

Current D group rules:

- `operatorSpacing`
- `typeCastSpacing`

When changing these features:

- Keep scanning and edit planning in `src/domain/operatorSpacing/`.
- Keep type cast scanning and edit planning in `src/domain/typeCastSpacing/`.
- Only affect operators inside the intended formatted changed ranges.
- Only affect type casts inside the intended formatted changed ranges.
- Avoid changing strings, comments, heredoc/nowdoc content, or unrelated text.
- Preserve PHP-specific operators such as `=>`, `??`, `?->`, `::`, `===`, `!==`,
  `&&`, and `||` according to the feature's existing intent.
- Ensure any generated edits do not overlap or conflict with formatter edits.

## Settings And Commands

User-facing command IDs and configuration keys must stay aligned between
`package.json` and `src/constants.ts`.

Current commands:

- `myGitPhpFormatter.formatChangedFiles`
- `myGitPhpFormatter.formatCurrentFile`

Current settings:

- `myGitPhpFormatter.enabled`
- `myGitPhpFormatter.dGroupCustomRules.mode`
- `myGitPhpFormatter.dGroupCustomRules.enabledRules`
- `myGitPhpFormatter.formatOnSave`
- `myGitPhpFormatter.skipMixedHtmlDocuments`
- `myGitPhpFormatter.debug`
- `myGitPhpFormatter.showNotifications`

When adding a setting:

- Add it to `package.json`.
- Add or reuse a constant in `src/constants.ts`.
- Read it through the config service.
- Document it in `README.md` if it is user-facing.
- Use the `order` property in `package.json` when the Settings UI display order matters.

When adding a command:

- Add it to `package.json`.
- Add or reuse a command constant in `src/constants.ts`.
- Register it from the presentation layer.
- Delegate real work to an application use case.
- Update `README.md`.

## Coding Guidelines

- Follow the existing TypeScript style.
- Keep files focused on one responsibility.
- Prefer small interfaces around external services when a use case needs an adapter.
- Keep pure logic testable, even though this repository does not yet have a test suite.
- Do not introduce new runtime dependencies unless they clearly reduce complexity.
- Do not edit generated `dist/` output by hand. Generate it with `npm run compile`.
- Avoid broad refactors when fixing a narrow issue.
- Preserve public behavior unless the user explicitly asks for a behavior change.
- Use meaningful names that reflect the formatting workflow vocabulary already in the codebase.

## Git And Generated Files

`dist/` is generated by TypeScript compilation and is referenced by the VS Code
extension manifest as `./dist/extension.js`.

When preparing a package or release-oriented change, compile before handing off
so `dist/` matches `src/`. For source-only development, follow the user's
instructions or the repository's current convention about whether compiled
output should be included in the change.

Do not revert unrelated user changes in the working tree.

## Suggested Change Workflow

1. Read the relevant use case, service, domain rule, and adapter before editing.
2. Identify which layer owns the behavior.
3. Keep the edit in the smallest reasonable set of files.
4. If the change touches extension metadata, update both `package.json` and constants/docs as needed.
5. Compile with `npm run compile`.
6. Run `npm test` when changing custom formatter rules or domain normalizers.
7. For packaging or release changes, run `npm run package:vsix`.
8. Summarize behavior changes and any verification that was or was not run.

## Verification Checklist

Always run this before handoff when code changes are made:

```sh
npm run compile
```

Run this when changing operator spacing, type cast spacing, or future custom rule normalizers:

```sh
npm test
```

Run this when changing `package.json`, activation events, extension metadata,
or release packaging behavior:

```sh
npm run package:vsix
```

Manual verification is useful for behavior changes:

- Open the extension in VS Code Extension Development Host.
- Configure a PHP formatter provider.
- Modify an existing PHP file and confirm only changed ranges are formatted.
- Add a new PHP file and confirm full-document formatting works.
- Try a mixed PHP/HTML file and confirm skip behavior follows the setting.
- Set `myGitPhpFormatter.dGroupCustomRules.mode` to `all` and confirm all D group rules run.
- Set `myGitPhpFormatter.dGroupCustomRules.mode` to `custom` and confirm only rules listed in `enabledRules` run.
- Set `myGitPhpFormatter.dGroupCustomRules.mode` to `off` and confirm D group rules do not run.
- Toggle `myGitPhpFormatter.formatOnSave` and confirm only the saved file is processed.

## Known Limitations

- Test coverage is currently limited to normalizer smoke tests.
- Behavior relies on the active VS Code PHP formatter provider.
- Range formatting behavior may differ between formatter providers.
- Mixed PHP/HTML detection is a protective heuristic, not a full template parser.

If tests are added later, update this file with the test command, test layout,
and expected local verification workflow.
