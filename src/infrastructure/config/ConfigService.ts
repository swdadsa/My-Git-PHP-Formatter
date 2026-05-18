import * as vscode from "vscode";
import { CONFIG_SECTION } from "../../constants";
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
    return this.getConfig().get("enabled", true);
  }

  /**
   * Returns whether verbose logs should be written to the output channel.
   */
  isDebugEnabled(): boolean {
    return this.getConfig().get("debug", false);
  }

  /**
   * Returns whether manual command results should be shown as notifications.
   */
  shouldShowNotifications(): boolean {
    return this.getConfig().get("showNotifications", true);
  }

  /**
   * Returns whether mixed PHP/HTML documents should be skipped.
   */
  shouldSkipMixedHtmlDocuments(): boolean {
    return this.getConfig().get("skipMixedHtmlDocuments", true);
  }

  /**
   * Returns whether operator spacing should be normalized after formatting.
   */
  shouldNormalizeOperatorSpacing(): boolean {
    return this.getConfig().get("normalizeOperatorSpacing", false);
  }

  /**
   * Returns whether the save hook should run.
   */
  shouldFormatOnSave(): boolean {
    return this.isExtensionEnabled() && this.getConfig().get("formatOnSave", false);
  }
}
