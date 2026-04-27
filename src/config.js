const vscode = require("vscode");
const { CONFIG_SECTION } = require("./constants");
const { isPhpFileDocument } = require("./formatter");

function getConfig() {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

function isExtensionEnabled() {
  return getConfig().get("enabled", true);
}

function isDebugEnabled() {
  return getConfig().get("debug", false);
}

function shouldShowNotifications() {
  return getConfig().get("showNotifications", true);
}

function shouldSkipMixedHtmlDocuments() {
  return getConfig().get("skipMixedHtmlDocuments", true);
}

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
  shouldFormatOnSave,
  shouldShowNotifications,
  shouldSkipMixedHtmlDocuments,
};
