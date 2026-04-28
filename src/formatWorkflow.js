const vscode = require("vscode");
const { collectChangedPhpFiles, getDocumentChangeInfo } = require("./git");
const {
  formatChangedDocument,
  formatDocumentWhole,
} = require("./formatter");
const { normalizeOperatorSpacing } = require("./operatorSpacingFixer");
const {
  getActivePhpDocument,
  shouldSkipDocument,
} = require("./documentGuards");

/**
 * Formats all changed PHP files in the current workspace.
 */
async function formatChangedFiles({ log, notify }) {
  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  if (workspaceFolders.length === 0) {
    throw new Error("Open a workspace folder before formatting changed files.");
  }

  const changedFiles = await collectChangedPhpFiles(workspaceFolders, log);
  if (changedFiles.length === 0) {
    notify.info("No changed PHP files were found.");
    return;
  }

  const result = await formatChangedFileEntries(changedFiles, log);
  notify.info(buildChangedFilesMessage(result));
}

/**
 * Formats the active PHP document when it has git changes.
 */
async function formatCurrentFile({ log, notify }) {
  const document = getActivePhpDocument();
  if (!document) {
    throw new Error("Open a PHP file before running this command.");
  }

  const info = await getDocumentChangeInfo(document.uri, log);
  if (!info) {
    notify.info("The current file is not inside a git repository.");
    return;
  }

  if (!info.hasChanges) {
    notify.info("The current PHP file has no git changes to format.");
    return;
  }

  if (shouldSkipDocument(document, log)) {
    notify.info("Skipped formatting because this file appears to contain substantial HTML markup.");
    return;
  }

  const changed = await formatDocumentFromChangeInfo(document, info, log);
  notify.info(changed ? "Formatted the current PHP file." : "No formatting changes were needed.");
}

/**
 * Formats one saved PHP document from the save event path.
 */
async function formatSavedDocument(document, { log }) {
  const info = await getDocumentChangeInfo(document.uri, log);
  if (!info || !info.hasChanges || shouldSkipDocument(document, log)) {
    return false;
  }

  return formatDocumentFromChangeInfo(document, info, log);
}

/**
 * Formats each changed file entry and tracks how many files were skipped.
 */
async function formatChangedFileEntries(changedFiles, log) {
  const result = {
    formattedCount: 0,
    skippedCount: 0,
  };

  for (const changedFile of changedFiles) {
    const document = await vscode.workspace.openTextDocument(changedFile.uri);

    if (shouldSkipDocument(document, log)) {
      result.skippedCount += 1;
      continue;
    }

    const changed = await formatDocumentFromChangeInfo(document, changedFile, log);
    if (changed) {
      result.formattedCount += 1;
    }
  }

  return result;
}

/**
 * Runs the VS Code formatter and then applies optional project-specific fixers.
 */
async function formatDocumentFromChangeInfo(document, info, log) {
  const formatted = info.isNew
    ? await formatDocumentWhole(document, log)
    : await formatChangedDocument(document, info.ranges, log);
  const fixedOperators = await normalizeOperatorSpacing(document, info, log);

  return formatted || fixedOperators;
}

/**
 * Builds the user-facing summary for the changed-files command.
 */
function buildChangedFilesMessage({ formattedCount, skippedCount }) {
  if (formattedCount > 0 && skippedCount > 0) {
    return `Formatted ${formattedCount} changed PHP file(s) and skipped ${skippedCount} mixed PHP/HTML file(s).`;
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
  formatChangedFiles,
  formatCurrentFile,
  formatSavedDocument,
};
