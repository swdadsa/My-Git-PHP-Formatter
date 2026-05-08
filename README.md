# My Git PHP Formatter

Format only the changed PHP lines from git diff. New PHP files are formatted as a whole document.

## Commands

- `My Git PHP Formatter: Format Changed PHP Files`
- `My Git PHP Formatter: Format Current PHP File`

## Settings

- `myGitPhpFormatter.enabled`
- `myGitPhpFormatter.formatOnSave`
- `myGitPhpFormatter.skipMixedHtmlDocuments`
- `myGitPhpFormatter.normalizeOperatorSpacing`
- `myGitPhpFormatter.showNotifications`
- `myGitPhpFormatter.debug`

## Notes

- This extension formats PHP files by calling the active VS Code formatter provider.
- If you want Intelephense to handle formatting, set it as the default PHP formatter in VS Code.
- Format on save only affects the file that was just saved.
- By default, files that look like mixed PHP/HTML templates are skipped to avoid full-file reformatting from range format providers.
- Operator spacing normalization is optional and only affects real PHP operators in the formatted changed ranges.

## Project Structure

- `extension.js`: extension activation entrypoint.
- `src/container.js`: wires services, use cases, and VS Code integration together.
- `src/presentation/`: VS Code command and save-event entrypoints.
- `src/application/`: formatting use cases and workflow orchestration.
- `src/domain/`: pure formatting rules, such as mixed HTML detection and operator spacing scanning.
- `src/infrastructure/`: adapters for git, VS Code formatting, settings, logging, and notifications.
- `src/constants.js`: shared command IDs and configuration constants.

The project uses a lightweight layered architecture:

- Presentation receives VS Code events and delegates work.
- Application coordinates the formatting workflow.
- Domain contains rules that can be understood without VS Code or git.
- Infrastructure touches external APIs such as VS Code, git, and the filesystem.

## Package As VSIX

1. Install dependencies:
   `npm install`
2. Create a VSIX:
   `npm run package:vsix`
3. Install the generated `.vsix` in VS Code:
   `Extensions: Install from VSIX...`
