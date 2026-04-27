const vscode = require("vscode");
const {
  isLikelyMixedHtmlDocument,
  isPhpFileDocument,
} = require("./formatter");
const { shouldSkipMixedHtmlDocuments } = require("./config");

function getActivePhpDocument() {
  const document = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.document
    : undefined;

  return document && isPhpFileDocument(document) ? document : undefined;
}

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
