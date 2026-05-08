/**
 * Decides whether a document should be skipped before formatting.
 */
class DocumentFormatPolicy {
  constructor({ config, logger, mixedHtmlDetector }) {
    this.config = config;
    this.logger = logger;
    this.mixedHtmlDetector = mixedHtmlDetector;
  }

  /**
   * Returns whether formatting should skip this document for safety reasons.
   */
  shouldSkip(document) {
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

module.exports = {
  DocumentFormatPolicy,
};
