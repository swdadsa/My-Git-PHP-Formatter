import * as vscode from "vscode";
import { MixedHtmlDetector } from "../../domain/mixedHtml/MixedHtmlDetector";
import {
  ConfigReader,
  DocumentFormatPolicyLike,
  LoggerLike,
} from "../../domain/types/services";

type DocumentFormatPolicyDependencies = {
  config: ConfigReader;
  logger: LoggerLike;
  mixedHtmlDetector: MixedHtmlDetector;
};

/**
 * Decides whether a document should be skipped before formatting.
 */
export class DocumentFormatPolicy implements DocumentFormatPolicyLike {
  private readonly config: ConfigReader;
  private readonly logger: LoggerLike;
  private readonly mixedHtmlDetector: MixedHtmlDetector;

  constructor({ config, logger, mixedHtmlDetector }: DocumentFormatPolicyDependencies) {
    this.config = config;
    this.logger = logger;
    this.mixedHtmlDetector = mixedHtmlDetector;
  }

  /**
   * Returns whether formatting should skip this document for safety reasons.
   */
  shouldSkip(document: vscode.TextDocument): boolean {
    if (!this.config.shouldSkipMixedHtmlDocuments()) {
      return false;
    }

    if (!this.mixedHtmlDetector.isLikelyMixedHtmlText(document.getText())) {
      return false;
    }

    this.logger.log(`Skipping mixed PHP/HTML document: ${document.uri.fsPath}`);
    return true;
  }
}
