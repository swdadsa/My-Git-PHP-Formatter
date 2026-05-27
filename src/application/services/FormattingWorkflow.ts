import * as vscode from "vscode";
import {
  ChangedPhpFile,
  FormatChangedFilesResult,
  FormatDocumentResult,
  FormatTargetInfo,
} from "../../domain/types/formatting";
import {
  CustomRuleRunnerLike,
  DocumentFormatPolicyLike,
  DocumentServiceLike,
  FormattingWorkflowLike,
  PhpFormatterLike,
} from "../../domain/types/services";

type FormattingWorkflowDependencies = {
  customRuleRunner: CustomRuleRunnerLike;
  documentPolicy: DocumentFormatPolicyLike;
  documentService: DocumentServiceLike;
  formatter: PhpFormatterLike;
};

/**
 * Coordinates formatter providers, document policies, and post-format fixers.
 */
export class FormattingWorkflow implements FormattingWorkflowLike {
  private readonly customRuleRunner: CustomRuleRunnerLike;
  private readonly documentPolicy: DocumentFormatPolicyLike;
  private readonly documentService: DocumentServiceLike;
  private readonly formatter: PhpFormatterLike;

  constructor({
    customRuleRunner,
    documentPolicy,
    documentService,
    formatter,
  }: FormattingWorkflowDependencies) {
    this.customRuleRunner = customRuleRunner;
    this.documentPolicy = documentPolicy;
    this.documentService = documentService;
    this.formatter = formatter;
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
   * Runs the VS Code formatter and then applies enabled custom formatting rules.
   */
  async formatDocumentFromChangeInfo(
    document: vscode.TextDocument,
    info: FormatTargetInfo
  ): Promise<boolean> {
    const formatted = info.isNew
      ? await this.formatter.formatWholeDocument(document)
      : await this.formatter.formatChangedRanges(document, info.ranges);
    const customRuleChanged = await this.customRuleRunner.apply(document, info);

    return formatted || customRuleChanged;
  }
}
