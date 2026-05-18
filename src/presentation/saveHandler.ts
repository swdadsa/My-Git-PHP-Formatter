import * as vscode from "vscode";
import { ExtensionServices } from "../container";
import {
  ConfigReader,
  DocumentServiceLike,
  FormatSavedDocumentUseCaseLike,
  LoggerLike,
} from "../domain/types/services";

type SaveHandlerServices = Pick<
  ExtensionServices,
  "config" | "documentService" | "logger" | "useCases"
>;

type SaveHandlerDependencies = {
  config: ConfigReader;
  documentService: DocumentServiceLike;
  formatSavedDocument: FormatSavedDocumentUseCaseLike;
  logger: LoggerLike;
};

/**
 * Registers the format-on-save listener.
 */
export function registerFormatOnSave({
  config,
  documentService,
  logger,
  useCases,
}: SaveHandlerServices): vscode.Disposable {
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
export class SaveHandler {
  private readonly config: ConfigReader;
  private readonly documentService: DocumentServiceLike;
  private readonly formatSavedDocument: FormatSavedDocumentUseCaseLike;
  private readonly logger: LoggerLike;
  private readonly saveGuard = new Set<string>();

  constructor({ config, documentService, formatSavedDocument, logger }: SaveHandlerDependencies) {
    this.config = config;
    this.documentService = documentService;
    this.formatSavedDocument = formatSavedDocument;
    this.logger = logger;
  }

  /**
   * Runs format-on-save for one document when settings and document type allow it.
   */
  async handle(document: vscode.TextDocument): Promise<void> {
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
      const message = error instanceof Error ? error.message : String(error);
      this.logger.log(`Format on save failed for ${document.uri.fsPath}: ${message}`);
    } finally {
      this.saveGuard.delete(guardKey);
    }
  }

  /**
   * Returns whether format-on-save should run for this saved document.
   */
  shouldHandleDocument(document: vscode.TextDocument): boolean {
    return this.config.shouldFormatOnSave() && this.documentService.isPhpFileDocument(document);
  }
}
