import * as vscode from "vscode";
import { FormatTargetInfo } from "../../domain/types/formatting";
import {
  DocumentServiceLike,
  LoggerLike,
  TypeCastSpacingFixerLike,
  TypeCastSpacingNormalizerLike,
} from "../../domain/types/services";
import { offsetToPosition } from "./VscodeOperatorSpacingFixer";
import { getTargetRanges } from "./formatTargetRanges";

type VscodeTypeCastSpacingFixerDependencies = {
  documentService: DocumentServiceLike;
  logger: LoggerLike;
  normalizer: TypeCastSpacingNormalizerLike;
};

/**
 * Applies domain-generated type cast spacing edits through the VS Code API.
 */
export class VscodeTypeCastSpacingFixer implements TypeCastSpacingFixerLike {
  private readonly documentService: DocumentServiceLike;
  private readonly logger: LoggerLike;
  private readonly normalizer: TypeCastSpacingNormalizerLike;

  constructor({
    documentService,
    logger,
    normalizer,
  }: VscodeTypeCastSpacingFixerDependencies) {
    this.documentService = documentService;
    this.logger = logger;
    this.normalizer = normalizer;
  }

  /**
   * Normalizes PHP type cast spacing after formatter edits.
   */
  async normalize(document: vscode.TextDocument, info: FormatTargetInfo): Promise<boolean> {
    if (!this.documentService.isPhpFileDocument(document)) {
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
        edit.replacement
      );
    }

    const applied = await vscode.workspace.applyEdit(workspaceEdit);
    if (!applied) {
      return false;
    }

    this.logger.log(
      `Normalized ${edits.length} type cast spacing occurrence(s) in ${activeDocument.uri.fsPath}`
    );

    const latestDocument = await this.documentService.openDocument(activeDocument.uri);
    await latestDocument.save();
    return true;
  }
}
