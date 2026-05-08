const vscode = require("vscode");
const { CONFIG_SECTION } = require("../constants");

/**
 * Reads extension settings from the VS Code configuration namespace.
 */
class ConfigService {
  /**
   * Returns the current extension configuration object.
   */
  getConfig() {
    return vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  /**
   * Returns whether the extension should run at all.
   */
  isExtensionEnabled() {
    return this.getConfig().get("enabled", true);
  }

  /**
   * Returns whether verbose logs should be written to the output channel.
   */
  isDebugEnabled() {
    return this.getConfig().get("debug", false);
  }

  /**
   * Returns whether manual command results should be shown as notifications.
   */
  shouldShowNotifications() {
    return this.getConfig().get("showNotifications", true);
  }

  /**
   * Returns whether mixed PHP/HTML documents should be skipped.
   */
  shouldSkipMixedHtmlDocuments() {
    return this.getConfig().get("skipMixedHtmlDocuments", true);
  }

  /**
   * Returns whether operator spacing should be normalized after formatting.
   */
  shouldNormalizeOperatorSpacing() {
    return this.getConfig().get("normalizeOperatorSpacing", false);
  }

  /**
   * Returns whether the save hook should run.
   */
  shouldFormatOnSave() {
    return this.isExtensionEnabled() && this.getConfig().get("formatOnSave", false);
  }
}

module.exports = {
  ConfigService,
};
