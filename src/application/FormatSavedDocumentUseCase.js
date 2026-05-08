/**
 * Formats one saved PHP document from the save event path.
 */
class FormatSavedDocumentUseCase {
  constructor({ gitChangeProvider, workflow }) {
    this.gitChangeProvider = gitChangeProvider;
    this.workflow = workflow;
  }

  /**
   * Executes save-triggered formatting for one document.
   */
  async execute(document) {
    const info = await this.gitChangeProvider.getDocumentChangeInfo(document.uri);
    if (!info || !info.hasChanges) {
      return false;
    }

    const result = await this.workflow.formatDocument(document, info);
    return result.changed;
  }
}

module.exports = {
  FormatSavedDocumentUseCase,
};
