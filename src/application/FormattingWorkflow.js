/**
 * Coordinates formatter providers, document policies, and post-format fixers.
 */
class FormattingWorkflow {
  constructor({ documentPolicy, documentService, formatter, operatorSpacingFixer }) {
    this.documentPolicy = documentPolicy;
    this.documentService = documentService;
    this.formatter = formatter;
    this.operatorSpacingFixer = operatorSpacingFixer;
  }

  /**
   * Formats each changed file entry and tracks how many files were skipped.
   */
  async formatChangedFileEntries(changedFiles) {
    const result = {
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
  async formatDocument(document, info) {
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
  async formatDocumentFromChangeInfo(document, info) {
    const formatted = info.isNew
      ? await this.formatter.formatWholeDocument(document)
      : await this.formatter.formatChangedRanges(document, info.ranges);
    const fixedOperators = await this.operatorSpacingFixer.normalize(document, info);

    return formatted || fixedOperators;
  }
}

module.exports = {
  FormattingWorkflow,
};
