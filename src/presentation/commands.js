const vscode = require("vscode");
const { COMMANDS } = require("../constants");

/**
 * Registers all command palette commands exposed by the extension.
 */
function registerCommands({ config, logger, notifier, useCases }) {
  return [
    vscode.commands.registerCommand(COMMANDS.formatChangedFiles, () =>
      runManualCommand(() => useCases.formatChangedFiles.execute(), { config, logger, notifier })
    ),
    vscode.commands.registerCommand(COMMANDS.formatCurrentFile, () =>
      runManualCommand(() => useCases.formatCurrentFile.execute(), { config, logger, notifier })
    ),
  ];
}

/**
 * Wraps manual commands with enabled-state checks and user-facing error handling.
 */
async function runManualCommand(work, { config, logger, notifier }) {
  try {
    if (!config.isExtensionEnabled()) {
      notifier.warning("My Git PHP Formatter is disabled in settings.");
      return;
    }

    await work();
  } catch (error) {
    logger.log(error.stack || error.message, true);
    notifier.error(error.message);
  }
}

module.exports = {
  registerCommands,
};
