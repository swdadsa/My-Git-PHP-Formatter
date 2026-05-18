import * as vscode from "vscode";
import { ChangedRange } from "../../domain/types/formatting";
import {
  DocumentServiceLike,
  LoggerLike,
  PhpFormatterLike,
} from "../../domain/types/services";

type VscodePhpFormatterDependencies = {
  documentService: DocumentServiceLike;
  logger: LoggerLike;
};

/**
 * Calls VS Code formatter providers and applies their edits.
 */
export class VscodePhpFormatter implements PhpFormatterLike {
  private readonly documentService: DocumentServiceLike;
  private readonly logger: LoggerLike;

  constructor({ documentService, logger }: VscodePhpFormatterDependencies) {
    this.documentService = documentService;
    this.logger = logger;
  }

  /**
   * Runs the active VS Code document formatter for an entire PHP file.
   */
  async formatWholeDocument(document: vscode.TextDocument): Promise<boolean> {
    if (!this.documentService.isPhpFileDocument(document)) {
      return false;
    }

    const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
      "vscode.executeFormatDocumentProvider",
      document.uri,
      this.getFormattingOptions(document)
    );

    this.logger.log(`Formatting whole document: ${document.uri.fsPath}`);
    return this.applyEditsAndSave(document, edits);
  }

  /**
   * Runs the active VS Code range formatter for changed line ranges.
   */
  async formatChangedRanges(
    document: vscode.TextDocument,
    ranges: ChangedRange[]
  ): Promise<boolean> {
    if (!this.documentService.isPhpFileDocument(document) || ranges.length === 0) {
      return false;
    }

    let hasChanges = false;

    // Apply range edits from bottom to top so earlier edits do not shift later hunks.
    const descending = [...ranges].sort((left, right) => right.startLine - left.startLine);

    for (const rangeInfo of descending) {
      const activeDocument = await this.documentService.openDocument(document.uri);
      const range = this.createRangeFromLineInfo(activeDocument, rangeInfo);

      if (!range) {
        continue;
      }

      this.logger.log(
        `Formatting changed range ${rangeInfo.startLine}-${rangeInfo.endLine} in ` +
          activeDocument.uri.fsPath
      );

      const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
        "vscode.executeFormatRangeProvider",
        activeDocument.uri,
        range,
        this.getFormattingOptions(activeDocument)
      );

      const applied = await this.applyEdits(activeDocument.uri, edits);
      if (applied) {
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      return false;
    }

    const latestDocument = await this.documentService.openDocument(document.uri);
    await latestDocument.save();
    return true;
  }

  /**
   * Converts a 1-based changed-line range into a VS Code range.
   */
  createRangeFromLineInfo(document: vscode.TextDocument, rangeInfo: ChangedRange): vscode.Range | null {
    const startLineIndex = Math.max(rangeInfo.startLine - 1, 0);
    const endLineIndex = Math.min(rangeInfo.endLine - 1, document.lineCount - 1);

    if (startLineIndex > endLineIndex || endLineIndex < 0) {
      return null;
    }

    const endCharacter = document.lineAt(endLineIndex).text.length;
    return new vscode.Range(
      new vscode.Position(startLineIndex, 0),
      new vscode.Position(endLineIndex, endCharacter)
    );
  }

  /**
   * Applies formatter edits to a document and saves it.
   */
  async applyEditsAndSave(
    document: vscode.TextDocument,
    edits: vscode.TextEdit[] | undefined
  ): Promise<boolean> {
    const applied = await this.applyEdits(document.uri, edits);
    if (!applied) {
      return false;
    }

    const latestDocument = await this.documentService.openDocument(document.uri);
    await latestDocument.save();
    return true;
  }

  /**
   * Applies raw VS Code text edits to a URI.
   */
  async applyEdits(uri: vscode.Uri, edits: vscode.TextEdit[] | undefined): Promise<boolean> {
    if (!Array.isArray(edits) || edits.length === 0) {
      return false;
    }

    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.set(uri, edits);
    return vscode.workspace.applyEdit(workspaceEdit);
  }

  /**
   * Reads editor formatting options for the target document.
   */
  getFormattingOptions(document: vscode.TextDocument): vscode.FormattingOptions {
    const editorConfig = vscode.workspace.getConfiguration("editor", document.uri);
    const tabSize = editorConfig.get("tabSize");

    return {
      tabSize: typeof tabSize === "number" ? tabSize : 4,
      insertSpaces: editorConfig.get("insertSpaces", true),
    };
  }
}
