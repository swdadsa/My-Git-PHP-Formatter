const vscode = require("vscode");
const { shouldFormatOnSave } = require("./config");
const { formatSavedDocument } = require("./formatWorkflow");

const saveGuard = new Set();

/**
 * Registers the format-on-save listener.
 */
function registerFormatOnSave(services) {
  return vscode.workspace.onDidSaveTextDocument((document) =>
    handleSavedDocument(document, services)
  );
}

/**
 * Handles one saved document while preventing recursive save-triggered loops.
 */
async function handleSavedDocument(document, services) {
  const { log } = services;

  if (!shouldFormatOnSave(document)) {
    return;
  }

  const guardKey = document.uri.toString();
  if (saveGuard.has(guardKey)) {
    return;
  }

  saveGuard.add(guardKey);

  try {
    await formatSavedDocument(document, services);
  } catch (error) {
    log(`Format on save failed for ${document.uri.fsPath}: ${error.message}`);
  } finally {
    saveGuard.delete(guardKey);
  }
}

module.exports = {
  registerFormatOnSave,
};
