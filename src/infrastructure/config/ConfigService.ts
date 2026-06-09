import * as vscode from "vscode";
import {
  CONFIG_KEYS,
  CONFIG_SECTION,
  D_GROUP_CUSTOM_RULE_MODES,
  D_GROUP_RULE_IDS,
} from "../../constants";
import { ConfigReader, DGroupCustomRulesMode } from "../../domain/types/services";

const DEFAULT_D_GROUP_RULE_IDS: string[] = [
  D_GROUP_RULE_IDS.operatorSpacing,
  D_GROUP_RULE_IDS.typeCastSpacing,
];

const D_GROUP_CUSTOM_RULE_MODE_VALUES = new Set<string>(
  Object.values(D_GROUP_CUSTOM_RULE_MODES)
);

/**
 * Reads extension settings from the VS Code configuration namespace.
 */
export class ConfigService implements ConfigReader {
  /**
   * Returns the current extension configuration object.
   */
  getConfig(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(CONFIG_SECTION);
  }

  /**
   * Returns whether the extension should run at all.
   */
  isExtensionEnabled(): boolean {
    return this.getConfig().get(CONFIG_KEYS.enabled, true);
  }

  /**
   * Returns whether verbose logs should be written to the output channel.
   */
  isDebugEnabled(): boolean {
    return this.getConfig().get(CONFIG_KEYS.debug, false);
  }

  /**
   * Returns whether manual command results should be shown as notifications.
   */
  shouldShowNotifications(): boolean {
    return this.getConfig().get(CONFIG_KEYS.showNotifications, true);
  }

  /**
   * Returns whether mixed PHP/HTML documents should be skipped.
   */
  shouldSkipMixedHtmlDocuments(): boolean {
    return this.getConfig().get(CONFIG_KEYS.skipMixedHtmlDocuments, true);
  }

  /**
   * Returns how D group custom formatting rules should be selected.
   *
   * The legacy boolean setting is still read as a migration fallback so users
   * who enabled D group rules before the mode setting existed keep the same
   * behavior after updating the extension.
   */
  getDGroupCustomRulesMode(): DGroupCustomRulesMode {
    const configuredMode = this.getConfiguredDGroupCustomRulesMode();

    if (configuredMode) {
      return configuredMode;
    }

    const legacyEnabled = this.getConfiguredLegacyDGroupCustomRulesEnabled();

    if (legacyEnabled !== undefined) {
      return legacyEnabled
        ? D_GROUP_CUSTOM_RULE_MODES.all
        : D_GROUP_CUSTOM_RULE_MODES.off;
    }

    return D_GROUP_CUSTOM_RULE_MODES.all;
  }

  /**
   * Returns the user-configured D group mode without falling back to the package default.
   */
  private getConfiguredDGroupCustomRulesMode(): DGroupCustomRulesMode | undefined {
    const inspectedMode = this.getConfig().inspect<string>(
      CONFIG_KEYS.dGroupCustomRulesMode
    );

    const configuredMode =
      inspectedMode?.workspaceFolderLanguageValue ??
      inspectedMode?.workspaceLanguageValue ??
      inspectedMode?.globalLanguageValue ??
      inspectedMode?.workspaceFolderValue ??
      inspectedMode?.workspaceValue ??
      inspectedMode?.globalValue;

    if (configuredMode && D_GROUP_CUSTOM_RULE_MODE_VALUES.has(configuredMode)) {
      return configuredMode as DGroupCustomRulesMode;
    }

    return undefined;
  }

  /**
   * Returns the user-configured legacy D group switch when it exists.
   */
  private getConfiguredLegacyDGroupCustomRulesEnabled(): boolean | undefined {
    const inspectedEnabled = this.getConfig().inspect<boolean>(
      CONFIG_KEYS.legacyDGroupCustomRulesEnabled
    );

    return (
      inspectedEnabled?.workspaceFolderLanguageValue ??
      inspectedEnabled?.workspaceLanguageValue ??
      inspectedEnabled?.globalLanguageValue ??
      inspectedEnabled?.workspaceFolderValue ??
      inspectedEnabled?.workspaceValue ??
      inspectedEnabled?.globalValue
    );
  }

  /**
   * Returns the D group rule IDs selected when the mode is set to custom.
   */
  getDGroupEnabledRuleIds(): string[] {
    const ruleIds = this.getConfig().get<string[]>(
      CONFIG_KEYS.dGroupEnabledRules,
      DEFAULT_D_GROUP_RULE_IDS
    );

    return ruleIds.filter((ruleId) => DEFAULT_D_GROUP_RULE_IDS.includes(ruleId));
  }

  /**
   * Returns whether the save hook should run.
   */
  shouldFormatOnSave(): boolean {
    return this.isExtensionEnabled() && this.getConfig().get(CONFIG_KEYS.formatOnSave, false);
  }
}
