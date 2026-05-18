import * as vscode from "vscode";
import {
  FormattingWorkflowLike,
  GitChangeProviderLike,
  FormatSavedDocumentUseCaseLike,
} from "../../domain/types/services";

type FormatSavedDocumentUseCaseDependencies = {
  gitChangeProvider: GitChangeProviderLike;
  workflow: FormattingWorkflowLike;
};

/**
 * Formats one saved PHP document from the save event path.
 */
export class FormatSavedDocumentUseCase implements FormatSavedDocumentUseCaseLike {
  private readonly gitChangeProvider: GitChangeProviderLike;
  private readonly workflow: FormattingWorkflowLike;

  constructor({ gitChangeProvider, workflow }: FormatSavedDocumentUseCaseDependencies) {
    this.gitChangeProvider = gitChangeProvider;
    this.workflow = workflow;
  }

  /**
   * Executes save-triggered formatting for one document.
   */
  async execute(document: vscode.TextDocument): Promise<boolean> {
    const info = await this.gitChangeProvider.getDocumentChangeInfo(document.uri);
    if (!info || !info.hasChanges) {
      return false;
    }

    const result = await this.workflow.formatDocument(document, info);
    return result.changed;
  }
}
