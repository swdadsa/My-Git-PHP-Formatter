const vscode = require("vscode");
const { OUTPUT_CHANNEL_NAME } = require("./src/constants");
const { registerCommands } = require("./src/commands");
const { createLogger } = require("./src/logger");
const { createNotifier } = require("./src/notifications");
const { registerFormatOnSave } = require("./src/saveHandler");

function activate(context) {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  const log = createLogger(output);
  const notify = createNotifier();
  const services = { log, notify };

  context.subscriptions.push(output);
  context.subscriptions.push(...registerCommands(services));
  context.subscriptions.push(registerFormatOnSave(services));
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
