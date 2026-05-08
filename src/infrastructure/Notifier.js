const vscode = require("vscode");

/**
 * Shows user-facing VS Code notifications while respecting extension settings.
 */
class Notifier {
  constructor(config) {
    this.config = config;
  }

  /**
   * Shows an informational VS Code notification.
   */
  info(message) {
    if (this.config.shouldShowNotifications()) {
      void vscode.window.showInformationMessage(message);
    }
  }

  /**
   * Shows a warning VS Code notification.
   */
  warning(message) {
    if (this.config.shouldShowNotifications()) {
      void vscode.window.showWarningMessage(message);
    }
  }

  /**
   * Shows an error VS Code notification.
   */
  error(message) {
    if (this.config.shouldShowNotifications()) {
      void vscode.window.showErrorMessage(message);
    }
  }
}

module.exports = {
  Notifier,
};
