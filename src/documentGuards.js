const vscode = require("vscode");
const {
  isLikelyMixedHtmlDocument,
  isPhpFileDocument,
} = require("./formatter");
const { shouldSkipMixedHtmlDocuments } = require("./config");

/**
 * Returns the active editor document when it is a PHP file.
 */
function getActivePhpDocument() {
  const document = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.document
    : undefined;

  return document && isPhpFileDocument(document) ? document : undefined;
}

/**
 * Returns whether formatting should skip this document for safety reasons.
 */
function shouldSkipDocument(document, log) {
  if (!shouldSkipMixedHtmlDocuments()) {
    return false;
  }

  if (!isLikelyMixedHtmlDocument(document)) {
    return false;
  }

  log(`Skipping mixed PHP/HTML document: ${document.uri.fsPath}`);
  return true;
}

module.exports = {
  getActivePhpDocument,
  shouldSkipDocument,
};
