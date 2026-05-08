const vscode = require("vscode");

/**
 * Provides document helpers around the VS Code API.
 */
class VscodeDocumentService {
  /**
   * Returns whether a document is a local PHP file.
   */
  isPhpFileDocument(document) {
    return document.uri.scheme === "file" && document.languageId === "php";
  }

  /**
   * Returns the active editor document when it is a PHP file.
   */
  getActivePhpDocument() {
    const document = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.document
      : undefined;

    return document && this.isPhpFileDocument(document) ? document : undefined;
  }

  /**
   * Opens the latest document state for a URI.
   */
  openDocument(uri) {
    return vscode.workspace.openTextDocument(uri);
  }
}

module.exports = {
  VscodeDocumentService,
};
