import * as vscode from "vscode";
import {
  ChangedPhpFile,
  FormatChangedFilesResult,
  FormatDocumentResult,
  FormatTargetInfo,
} from "../../domain/types/formatting";
import {
  DocumentFormatPolicyLike,
  DocumentServiceLike,
  FormattingWorkflowLike,
  OperatorSpacingFixerLike,
  PhpFormatterLike,
} from "../../domain/types/services";

type FormattingWorkflowDependencies = {
  documentPolicy: DocumentFormatPolicyLike;
  documentService: DocumentServiceLike;
  formatter: PhpFormatterLike;
  operatorSpacingFixer: OperatorSpacingFixerLike;
};

/**
 * Coordinates formatter providers, document policies, and post-format fixers.
 */
export class FormattingWorkflow implements FormattingWorkflowLike {
  private readonly documentPolicy: DocumentFormatPolicyLike;
  private readonly documentService: DocumentServiceLike;
  private readonly formatter: PhpFormatterLike;
  private readonly operatorSpacingFixer: OperatorSpacingFixerLike;

  constructor({
    documentPolicy,
    documentService,
    formatter,
    operatorSpacingFixer,
  }: FormattingWorkflowDependencies) {
    this.documentPolicy = documentPolicy;
    this.documentService = documentService;
    this.formatter = formatter;
    this.operatorSpacingFixer = operatorSpacingFixer;
  }

  /**
   * Formats each changed file entry and tracks how many files were skipped.
   */
  async formatChangedFileEntries(changedFiles: ChangedPhpFile[]): Promise<FormatChangedFilesResult> {
    const result: FormatChangedFilesResult = {
      formattedCount: 0,
      skippedCount: 0,
    };

    for (const changedFile of changedFiles) {
      const document = await this.documentService.openDocument(changedFile.uri);

      if (this.documentPolicy.shouldSkip(document)) {
        result.skippedCount += 1;
        continue;
      }

      const changed = await this.formatDocumentFromChangeInfo(document, changedFile);
      if (changed) {
        result.formattedCount += 1;
      }
    }

    return result;
  }

  /**
   * Formats one document if it is not skipped by policy.
   */
  async formatDocument(
    document: vscode.TextDocument,
    info: FormatTargetInfo
  ): Promise<FormatDocumentResult> {
    if (this.documentPolicy.shouldSkip(document)) {
      return {
        changed: false,
        skipped: true,
      };
    }

    return {
      changed: await this.formatDocumentFromChangeInfo(document, info),
      skipped: false,
    };
  }

  /**
   * Runs the VS Code formatter and then applies optional project-specific fixers.
   */
  async formatDocumentFromChangeInfo(
    document: vscode.TextDocument,
    info: FormatTargetInfo
  ): Promise<boolean> {
    const formatted = info.isNew
      ? await this.formatter.formatWholeDocument(document)
      : await this.formatter.formatChangedRanges(document, info.ranges);
    const fixedOperators = await this.operatorSpacingFixer.normalize(document, info);

    return formatted || fixedOperators;
  }
}
