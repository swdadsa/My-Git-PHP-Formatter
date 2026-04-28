const vscode = require("vscode");
const { shouldShowNotifications } = require("./config");

/**
 * Creates notification helpers that respect the extension notification setting.
 */
function createNotifier() {
  return {
    /**
     * Shows an informational VS Code notification.
     */
    info(message) {
      if (shouldShowNotifications()) {
        void vscode.window.showInformationMessage(message);
      }
    },

    /**
     * Shows a warning VS Code notification.
     */
    warning(message) {
      if (shouldShowNotifications()) {
        void vscode.window.showWarningMessage(message);
      }
    },

    /**
     * Shows an error VS Code notification.
     */
    error(message) {
      if (shouldShowNotifications()) {
        void vscode.window.showErrorMessage(message);
      }
    },
  };
}

module.exports = {
  createNotifier,
};
