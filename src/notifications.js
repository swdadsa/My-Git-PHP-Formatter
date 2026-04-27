const vscode = require("vscode");
const { shouldShowNotifications } = require("./config");

function createNotifier() {
  return {
    info(message) {
      if (shouldShowNotifications()) {
        void vscode.window.showInformationMessage(message);
      }
    },

    warning(message) {
      if (shouldShowNotifications()) {
        void vscode.window.showWarningMessage(message);
      }
    },

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
