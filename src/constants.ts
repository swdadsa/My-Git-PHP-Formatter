export const CONFIG_SECTION = "myGitPhpFormatter";
export const OUTPUT_CHANNEL_NAME = "My Git PHP Formatter";

export const COMMANDS = {
  formatChangedFiles: "myGitPhpFormatter.formatChangedFiles",
  formatCurrentFile: "myGitPhpFormatter.formatCurrentFile",
} as const;

export const CONFIG_KEYS = {
  enabled: "enabled",
  dGroupCustomRulesMode: "dGroupCustomRules.mode",
  dGroupEnabledRules: "dGroupCustomRules.enabledRules",
  formatOnSave: "formatOnSave",
  skipMixedHtmlDocuments: "skipMixedHtmlDocuments",
  debug: "debug",
  showNotifications: "showNotifications",
  legacyDGroupCustomRulesEnabled: "dGroupCustomRules.enabled",
} as const;

export const D_GROUP_CUSTOM_RULE_MODES = {
  all: "all",
  custom: "custom",
  off: "off",
} as const;

export const D_GROUP_RULE_IDS = {
  operatorSpacing: "operatorSpacing",
  typeCastSpacing: "typeCastSpacing",
} as const;
