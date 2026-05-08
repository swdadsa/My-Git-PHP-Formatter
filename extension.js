const { createExtensionServices } = require("./src/container");
const { registerCommands } = require("./src/presentation/commands");
const { registerFormatOnSave } = require("./src/presentation/saveHandler");

/**
 * Activates the extension and wires together shared services and VS Code hooks.
 */
function activate(context) {
  const services = createExtensionServices();

  context.subscriptions.push(services.output);
  context.subscriptions.push(...registerCommands(services));
  context.subscriptions.push(registerFormatOnSave(services));
}

/**
 * Placeholder for future cleanup when the extension is deactivated.
 */
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
