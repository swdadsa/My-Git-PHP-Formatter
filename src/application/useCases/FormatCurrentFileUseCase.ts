import {
  DocumentServiceLike,
  FormattingWorkflowLike,
  GitChangeProviderLike,
  NotifierLike,
} from "../../domain/types/services";

type FormatCurrentFileUseCaseDependencies = {
  documentService: DocumentServiceLike;
  gitChangeProvider: GitChangeProviderLike;
  notifier: NotifierLike;
  workflow: FormattingWorkflowLike;
};

/**
 * Formats the active PHP document when it has git changes.
 */
export class FormatCurrentFileUseCase {
  private readonly documentService: DocumentServiceLike;
  private readonly gitChangeProvider: GitChangeProviderLike;
  private readonly notifier: NotifierLike;
  private readonly workflow: FormattingWorkflowLike;

  constructor({
    documentService,
    gitChangeProvider,
    notifier,
    workflow,
  }: FormatCurrentFileUseCaseDependencies) {
    this.documentService = documentService;
    this.gitChangeProvider = gitChangeProvider;
    this.notifier = notifier;
    this.workflow = workflow;
  }

  /**
   * Executes the current-file formatting command.
   */
  async execute(): Promise<void> {
    const document = this.documentService.getActivePhpDocument();
    if (!document) {
      throw new Error("Open a PHP file before running this command.");
    }

    const info = await this.gitChangeProvider.getDocumentChangeInfo(document.uri);
    if (!info) {
      this.notifier.info("The current file is not inside a git repository.");
      return;
    }

    if (!info.hasChanges) {
      this.notifier.info("The current PHP file has no git changes to format.");
      return;
    }

    const result = await this.workflow.formatDocument(document, info);
    if (result.skipped) {
      this.notifier.info("Skipped formatting because this file appears to contain substantial HTML markup.");
      return;
    }

    this.notifier.info(
      result.changed ? "Formatted the current PHP file." : "No formatting changes were needed."
    );
  }
}
