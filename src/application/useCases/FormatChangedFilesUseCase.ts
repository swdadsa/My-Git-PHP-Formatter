import * as vscode from "vscode";
import { FormatChangedFilesResult } from "../../domain/types/formatting";
import {
  FormattingWorkflowLike,
  GitChangeProviderLike,
  NotifierLike,
} from "../../domain/types/services";

type FormatChangedFilesUseCaseDependencies = {
  gitChangeProvider: GitChangeProviderLike;
  notifier: NotifierLike;
  workflow: FormattingWorkflowLike;
};

/**
 * Formats all changed PHP files in the current workspace.
 */
export class FormatChangedFilesUseCase {
  private readonly gitChangeProvider: GitChangeProviderLike;
  private readonly notifier: NotifierLike;
  private readonly workflow: FormattingWorkflowLike;

  constructor({ gitChangeProvider, notifier, workflow }: FormatChangedFilesUseCaseDependencies) {
    this.gitChangeProvider = gitChangeProvider;
    this.notifier = notifier;
    this.workflow = workflow;
  }

  /**
   * Executes the changed-files formatting command.
   */
  async execute(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    if (workspaceFolders.length === 0) {
      throw new Error("Open a workspace folder before formatting changed files.");
    }

    const changedFiles = await this.gitChangeProvider.collectChangedPhpFiles(workspaceFolders);
    if (changedFiles.length === 0) {
      this.notifier.info("No changed PHP files were found.");
      return;
    }

    const result = await this.workflow.formatChangedFileEntries(changedFiles);
    this.notifier.info(buildChangedFilesMessage(result));
  }
}

/**
 * Builds the user-facing summary for the changed-files command.
 */
export function buildChangedFilesMessage({
  formattedCount,
  skippedCount,
}: FormatChangedFilesResult): string {
  if (formattedCount > 0 && skippedCount > 0) {
    return `Formatted ${formattedCount} changed PHP file(s) and ` +
      `skipped ${skippedCount} mixed PHP/HTML file(s).`;
  }

  if (formattedCount > 0) {
    return `Formatted ${formattedCount} changed PHP file(s).`;
  }

  if (skippedCount > 0) {
    return `Skipped ${skippedCount} mixed PHP/HTML file(s).`;
  }

  return "No formatting changes were needed.";
}
