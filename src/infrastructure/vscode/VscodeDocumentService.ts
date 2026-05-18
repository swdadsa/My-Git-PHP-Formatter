import * as vscode from "vscode";
import { DocumentServiceLike } from "../../domain/types/services";

/**
 * Provides document helpers around the VS Code API.
 */
export class VscodeDocumentService implements DocumentServiceLike {
  /**
   * Returns whether a document is a local PHP file.
   */
  isPhpFileDocument(document: vscode.TextDocument): boolean {
    return document.uri.scheme === "file" && document.languageId === "php";
  }

  /**
   * Returns the active editor document when it is a PHP file.
   */
  getActivePhpDocument(): vscode.TextDocument | undefined {
    const document = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.document
      : undefined;

    return document && this.isPhpFileDocument(document) ? document : undefined;
  }

  /**
   * Opens the latest document state for a URI.
   */
  openDocument(uri: vscode.Uri): Thenable<vscode.TextDocument> {
    return vscode.workspace.openTextDocument(uri);
  }
}
