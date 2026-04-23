const vscode = require("vscode");
const { collectChangedPhpFiles, getDocumentChangeInfo } = require("./src/git");
const {
  formatChangedDocument,
  formatDocumentWhole,
  isPhpFileDocument,
} = require("./src/formatter");

const OUTPUT_CHANNEL_NAME = "My Git PHP Formatter";
const SAVE_GUARD = new Set();

function activate(context) {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(output);

  const log = createLogger(output);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "myGitPhpFormatter.formatChangedFiles",
      async () => {
        await runManualCommand(async () => {
          const workspaceFolders = vscode.workspace.workspaceFolders || [];
          if (workspaceFolders.length === 0) {
            throw new Error("Open a workspace folder before formatting changed files.");
          }

          const changedFiles = await collectChangedPhpFiles(workspaceFolders, log);
          if (changedFiles.length === 0) {
            notifyInfo("No changed PHP files were found.");
            return;
          }

          let formattedCount = 0;
          for (const changedFile of changedFiles) {
            const document = await vscode.workspace.openTextDocument(changedFile.uri);
            const changed = changedFile.isNew
              ? await formatDocumentWhole(document, log)
              : await formatChangedDocument(document, changedFile.ranges, log);

            if (changed) {
              formattedCount += 1;
            }
          }

          notifyInfo(
            formattedCount > 0
              ? `Formatted ${formattedCount} changed PHP file(s).`
              : "No formatting changes were needed."
          );
        }, log);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "myGitPhpFormatter.formatCurrentFile",
      async () => {
        await runManualCommand(async () => {
          const document = getActivePhpDocument();
          if (!document) {
            throw new Error("Open a PHP file before running this command.");
          }

          const info = await getDocumentChangeInfo(document.uri, log);
          if (!info) {
            notifyInfo("The current file is not inside a git repository.");
            return;
          }

          if (!info.hasChanges) {
            notifyInfo("The current PHP file has no git changes to format.");
            return;
          }

          const changed = info.isNew
            ? await formatDocumentWhole(document, log)
            : await formatChangedDocument(document, info.ranges, log);

          notifyInfo(changed ? "Formatted the current PHP file." : "No formatting changes were needed.");
        }, log);
      }
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (!shouldFormatOnSave(document)) {
        return;
      }

      const guardKey = document.uri.toString();
      if (SAVE_GUARD.has(guardKey)) {
        return;
      }

      SAVE_GUARD.add(guardKey);

      try {
        const info = await getDocumentChangeInfo(document.uri, log);
        if (!info || !info.hasChanges) {
          return;
        }

        if (info.isNew) {
          await formatDocumentWhole(document, log);
        } else {
          await formatChangedDocument(document, info.ranges, log);
        }
      } catch (error) {
        log(`Format on save failed for ${document.uri.fsPath}: ${error.message}`);
      } finally {
        SAVE_GUARD.delete(guardKey);
      }
    })
  );
}

function deactivate() {}

function createLogger(output) {
  return (message, always = false) => {
    if (always || getConfig().get("debug", false)) {
      output.appendLine(message);
    }
  };
}

function getConfig() {
  return vscode.workspace.getConfiguration("myGitPhpFormatter");
}

function shouldFormatOnSave(document) {
  const config = getConfig();
  return (
    config.get("enabled", true) &&
    config.get("formatOnSave", false) &&
    isPhpFileDocument(document)
  );
}

function getActivePhpDocument() {
  const document = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.document
    : undefined;

  return document && isPhpFileDocument(document) ? document : undefined;
}

async function runManualCommand(work, log) {
  try {
    if (!getConfig().get("enabled", true)) {
      notifyWarning("My Git PHP Formatter is disabled in settings.");
      return;
    }

    await work();
  } catch (error) {
    log(error.stack || error.message, true);
    notifyError(error.message);
  }
}

function notifyInfo(message) {
  if (getConfig().get("showNotifications", true)) {
    void vscode.window.showInformationMessage(message);
  }
}

function notifyWarning(message) {
  if (getConfig().get("showNotifications", true)) {
    void vscode.window.showWarningMessage(message);
  }
}

function notifyError(message) {
  if (getConfig().get("showNotifications", true)) {
    void vscode.window.showErrorMessage(message);
  }
}

module.exports = {
  activate,
  deactivate,
};
