const vscode = require("vscode");

/**
 * Registers the format-on-save listener.
 */
function registerFormatOnSave({ config, documentService, logger, useCases }) {
  const handler = new SaveHandler({
    config,
    documentService,
    logger,
    formatSavedDocument: useCases.formatSavedDocument,
  });

  return vscode.workspace.onDidSaveTextDocument((document) => handler.handle(document));
}

/**
 * Handles save events while preventing recursive save-triggered loops.
 */
class SaveHandler {
  constructor({ config, documentService, formatSavedDocument, logger }) {
    this.config = config;
    this.documentService = documentService;
    this.formatSavedDocument = formatSavedDocument;
    this.logger = logger;
    this.saveGuard = new Set();
  }

  /**
   * Runs format-on-save for one document when settings and document type allow it.
   */
  async handle(document) {
    if (!this.shouldHandleDocument(document)) {
      return;
    }

    const guardKey = document.uri.toString();
    if (this.saveGuard.has(guardKey)) {
      return;
    }

    this.saveGuard.add(guardKey);

    try {
      await this.formatSavedDocument.execute(document);
    } catch (error) {
      this.logger.log(`Format on save failed for ${document.uri.fsPath}: ${error.message}`);
    } finally {
      this.saveGuard.delete(guardKey);
    }
  }

  /**
   * Returns whether format-on-save should run for this saved document.
   */
  shouldHandleDocument(document) {
    return this.config.shouldFormatOnSave() && this.documentService.isPhpFileDocument(document);
  }
}

module.exports = {
  SaveHandler,
  registerFormatOnSave,
};
