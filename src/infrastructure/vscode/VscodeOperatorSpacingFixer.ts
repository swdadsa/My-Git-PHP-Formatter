import * as vscode from "vscode";
import {
  getLineStarts,
  getTargetRanges,
} from "../../domain/operatorSpacing/OperatorSpacingNormalizer";
import { FormatTargetInfo } from "../../domain/types/formatting";
import {
  ConfigReader,
  DocumentServiceLike,
  LoggerLike,
  OperatorSpacingFixerLike,
  OperatorSpacingNormalizerLike,
} from "../../domain/types/services";

type VscodeOperatorSpacingFixerDependencies = {
  config: ConfigReader;
  documentService: DocumentServiceLike;
  logger: LoggerLike;
  normalizer: OperatorSpacingNormalizerLike;
};

/**
 * Applies domain-generated operator spacing edits through the VS Code API.
 */
export class VscodeOperatorSpacingFixer implements OperatorSpacingFixerLike {
  private readonly config: ConfigReader;
  private readonly documentService: DocumentServiceLike;
  private readonly logger: LoggerLike;
  private readonly normalizer: OperatorSpacingNormalizerLike;

  constructor({
    config,
    documentService,
    logger,
    normalizer,
  }: VscodeOperatorSpacingFixerDependencies) {
    this.config = config;
    this.documentService = documentService;
    this.logger = logger;
    this.normalizer = normalizer;
  }

  /**
   * Normalizes whitespace around configured PHP operators after formatter edits.
   */
  async normalize(document: vscode.TextDocument, info: FormatTargetInfo): Promise<boolean> {
    if (!this.config.shouldNormalizeOperatorSpacing() ||
      !this.documentService.isPhpFileDocument(document)) {
      return false;
    }

    const activeDocument = await this.documentService.openDocument(document.uri);
    const targetRanges = getTargetRanges(activeDocument, info);
    const edits = this.normalizer.buildEdits(activeDocument.getText(), targetRanges);

    if (edits.length === 0) {
      return false;
    }

    const workspaceEdit = new vscode.WorkspaceEdit();
    for (const edit of edits) {
      workspaceEdit.replace(
        activeDocument.uri,
        new vscode.Range(
          offsetToPosition(edit.startOffset, edit.lineStarts),
          offsetToPosition(edit.endOffset, edit.lineStarts)
        ),
        ` ${edit.operator} `
      );
    }

    const applied = await vscode.workspace.applyEdit(workspaceEdit);
    if (!applied) {
      return false;
    }

    this.logger.log(
      `Normalized ${edits.length} operator spacing occurrence(s) in ${activeDocument.uri.fsPath}`
    );

    const latestDocument = await this.documentService.openDocument(activeDocument.uri);
    await latestDocument.save();
    return true;
  }
}

/**
 * Converts an absolute text offset into a VS Code position.
 */
export function offsetToPosition(offset: number, lineStarts: number[]): vscode.Position {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (lineStarts[middle] <= offset) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const line = Math.max(high, 0);
  return new vscode.Position(line, offset - lineStarts[line]);
}

export { getLineStarts };
