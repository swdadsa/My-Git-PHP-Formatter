import * as vscode from "vscode";
import { createExtensionServices } from "./container";
import { registerCommands } from "./presentation/commands";
import { registerFormatOnSave } from "./presentation/saveHandler";

/**
 * Activates the extension and wires together shared services and VS Code hooks.
 */
export function activate(context: vscode.ExtensionContext): void {
  const services = createExtensionServices();

  context.subscriptions.push(services.output);
  context.subscriptions.push(...registerCommands(services));
  context.subscriptions.push(registerFormatOnSave(services));
}

/**
 * Placeholder for future cleanup when the extension is deactivated.
 */
export function deactivate(): void {}
