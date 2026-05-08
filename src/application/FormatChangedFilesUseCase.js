const vscode = require("vscode");

/**
 * Formats all changed PHP files in the current workspace.
 */
class FormatChangedFilesUseCase {
  constructor({ gitChangeProvider, notifier, workflow }) {
    this.gitChangeProvider = gitChangeProvider;
    this.notifier = notifier;
    this.workflow = workflow;
  }

  /**
   * Executes the changed-files formatting command.
   */
  async execute() {
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
function buildChangedFilesMessage({ formattedCount, skippedCount }) {
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

module.exports = {
  FormatChangedFilesUseCase,
  buildChangedFilesMessage,
};
