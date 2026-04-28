const vscode = require("vscode");
const { COMMANDS } = require("./constants");
const { isExtensionEnabled } = require("./config");
const {
  formatChangedFiles,
  formatCurrentFile,
} = require("./formatWorkflow");

/**
 * Registers all command palette commands exposed by the extension.
 */
function registerCommands(services) {
  return [
    vscode.commands.registerCommand(COMMANDS.formatChangedFiles, () =>
      runManualCommand(() => formatChangedFiles(services), services)
    ),
    vscode.commands.registerCommand(COMMANDS.formatCurrentFile, () =>
      runManualCommand(() => formatCurrentFile(services), services)
    ),
  ];
}

/**
 * Wraps manual commands with enabled-state checks and user-facing error handling.
 */
async function runManualCommand(work, { log, notify }) {
  try {
    if (!isExtensionEnabled()) {
      notify.warning("My Git PHP Formatter is disabled in settings.");
      return;
    }

    await work();
  } catch (error) {
    log(error.stack || error.message, true);
    notify.error(error.message);
  }
}

module.exports = {
  registerCommands,
};
