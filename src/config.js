const vscode = require("vscode");
const { CONFIG_SECTION } = require("./constants");
const { isPhpFileDocument } = require("./formatter");

/**
 * Reads this extension's VS Code configuration namespace.
 */
function getConfig() {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

/**
 * Returns whether the extension should run at all.
 */
function isExtensionEnabled() {
  return getConfig().get("enabled", true);
}

/**
 * Returns whether verbose messages should be written to the output channel.
 */
function isDebugEnabled() {
  return getConfig().get("debug", false);
}

/**
 * Returns whether manual command results should be shown as VS Code notifications.
 */
function shouldShowNotifications() {
  return getConfig().get("showNotifications", true);
}

/**
 * Returns whether mixed PHP/HTML documents should be skipped before formatting.
 */
function shouldSkipMixedHtmlDocuments() {
  return getConfig().get("skipMixedHtmlDocuments", true);
}

/**
 * Returns whether common PHP operator spacing should be normalized after formatting.
 */
function shouldNormalizeOperatorSpacing() {
  return getConfig().get("normalizeOperatorSpacing", false);
}

/**
 * Returns whether the save hook should format this document.
 */
function shouldFormatOnSave(document) {
  return (
    isExtensionEnabled() &&
    getConfig().get("formatOnSave", false) &&
    isPhpFileDocument(document)
  );
}

module.exports = {
  getConfig,
  isDebugEnabled,
  isExtensionEnabled,
  shouldNormalizeOperatorSpacing,
  shouldFormatOnSave,
  shouldShowNotifications,
  shouldSkipMixedHtmlDocuments,
};
