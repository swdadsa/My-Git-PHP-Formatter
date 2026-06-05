export const CONFIG_SECTION = "myGitPhpFormatter";
export const OUTPUT_CHANNEL_NAME = "My Git PHP Formatter";

export const COMMANDS = {
  formatChangedFiles: "myGitPhpFormatter.formatChangedFiles",
  formatCurrentFile: "myGitPhpFormatter.formatCurrentFile",
} as const;

export const CONFIG_KEYS = {
  debug: "debug",
  dGroupCustomRulesEnabled: "dGroupCustomRules.enabled",
  dGroupOperatorSpacing: "dGroupCustomRules.operatorSpacing",
  dGroupTypeCastSpacing: "dGroupCustomRules.typeCastSpacing",
  enabled: "enabled",
  formatOnSave: "formatOnSave",
  showNotifications: "showNotifications",
  skipMixedHtmlDocuments: "skipMixedHtmlDocuments",
} as const;
