# My Git PHP Formatter

Format only the changed PHP lines from git diff. New PHP files are formatted as a whole document.

## Commands

- `My Git PHP Formatter: Format Changed PHP Files`
- `My Git PHP Formatter: Format Current PHP File`

## Settings

- `myGitPhpFormatter.enabled`
- `myGitPhpFormatter.formatOnSave`
- `myGitPhpFormatter.skipMixedHtmlDocuments`
- `myGitPhpFormatter.showNotifications`
- `myGitPhpFormatter.debug`

## Notes

- This extension formats PHP files by calling the active VS Code formatter provider.
- If you want Intelephense to handle formatting, set it as the default PHP formatter in VS Code.
- Format on save only affects the file that was just saved.
- By default, files that look like mixed PHP/HTML templates are skipped to avoid full-file reformatting from range format providers.

## Project Structure

- `extension.js`: extension activation entrypoint.
- `src/commands.js`: command registration and manual-command error handling.
- `src/formatWorkflow.js`: high-level formatting flows for changed files, current file, and save events.
- `src/git.js`: git repository discovery, changed PHP file discovery, and diff hunk parsing.
- `src/formatter.js`: VS Code formatter calls and PHP document detection.
- `src/saveHandler.js`: format-on-save event handling and save-loop guard.
- `src/config.js`: extension setting reads.
- `src/notifications.js`: user notification wrapper.
- `src/logger.js`: output-channel logger.

## Package As VSIX

1. Install dependencies:
   `npm install`
2. Create a VSIX:
   `npm run package:vsix`
3. Install the generated `.vsix` in VS Code:
   `Extensions: Install from VSIX...`
