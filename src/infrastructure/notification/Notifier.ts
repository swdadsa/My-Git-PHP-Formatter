import * as vscode from "vscode";
import { ConfigReader, NotifierLike } from "../../domain/types/services";

/**
 * Shows user-facing VS Code notifications while respecting extension settings.
 */
export class Notifier implements NotifierLike {
  private readonly config: ConfigReader;

  constructor(config: ConfigReader) {
    this.config = config;
  }

  /**
   * Shows an informational VS Code notification.
   */
  info(message: string): void {
    if (this.config.shouldShowNotifications()) {
      void vscode.window.showInformationMessage(message);
    }
  }

  /**
   * Shows a warning VS Code notification.
   */
  warning(message: string): void {
    if (this.config.shouldShowNotifications()) {
      void vscode.window.showWarningMessage(message);
    }
  }

  /**
   * Shows an error VS Code notification.
   */
  error(message: string): void {
    if (this.config.shouldShowNotifications()) {
      void vscode.window.showErrorMessage(message);
    }
  }
}
