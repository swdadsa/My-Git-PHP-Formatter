# My Git PHP Formatter

Format only the changed PHP lines from git diff. New PHP files are formatted as a whole document.

## Commands

- `My Git PHP Formatter: Format Changed PHP Files`
- `My Git PHP Formatter: Format Current PHP File`

## Settings

- `myGitPhpFormatter.enabled`
- `myGitPhpFormatter.formatOnSave`
- `myGitPhpFormatter.showNotifications`
- `myGitPhpFormatter.debug`

## Notes

- This extension formats PHP files by calling the active VS Code formatter provider.
- If you want Intelephense to handle formatting, set it as the default PHP formatter in VS Code.
- Format on save only affects the file that was just saved.

## Package As VSIX

1. Install dependencies:
   `npm install`
2. Create a VSIX:
   `npm run package:vsix`
3. Install the generated `.vsix` in VS Code:
   `Extensions: Install from VSIX...`
