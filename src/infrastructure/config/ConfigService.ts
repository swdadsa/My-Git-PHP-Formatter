import * as vscode from "vscode";
import { CONFIG_KEYS, CONFIG_SECTION } from "../../constants";
import { ConfigReader } from "../../domain/types/services";

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
   * Returns whether D group custom formatting rules should run.
   */
  shouldRunDGroupCustomRules(): boolean {
    return this.getConfig().get(CONFIG_KEYS.dGroupCustomRulesEnabled, false);
  }

  /**
   * Returns whether the D group operator spacing rule should run.
   */
  shouldRunDGroupOperatorSpacingRule(): boolean {
    return this.getConfig().get(CONFIG_KEYS.dGroupOperatorSpacing, true);
  }

  /**
   * Returns whether the save hook should run.
   */
  shouldFormatOnSave(): boolean {
    return this.isExtensionEnabled() && this.getConfig().get(CONFIG_KEYS.formatOnSave, false);
  }
}
