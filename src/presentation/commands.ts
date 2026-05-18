import * as vscode from "vscode";
import { COMMANDS } from "../constants";
import { ConfigReader, LoggerLike, NotifierLike } from "../domain/types/services";
import { ExtensionServices } from "../container";

type CommandServices = Pick<ExtensionServices, "config" | "logger" | "notifier" | "useCases">;

type ManualCommandServices = {
  config: ConfigReader;
  logger: LoggerLike;
  notifier: NotifierLike;
};

/**
 * Registers all command palette commands exposed by the extension.
 */
export function registerCommands({
  config,
  logger,
  notifier,
  useCases,
}: CommandServices): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(COMMANDS.formatChangedFiles, () =>
      runManualCommand(() => useCases.formatChangedFiles.execute(), { config, logger, notifier })
    ),
    vscode.commands.registerCommand(COMMANDS.formatCurrentFile, () =>
      runManualCommand(() => useCases.formatCurrentFile.execute(), { config, logger, notifier })
    ),
  ];
}

/**
 * Wraps manual commands with enabled-state checks and user-facing error handling.
 */
async function runManualCommand(
  work: () => Promise<void>,
  { config, logger, notifier }: ManualCommandServices
): Promise<void> {
  try {
    if (!config.isExtensionEnabled()) {
      notifier.warning("My Git PHP Formatter is disabled in settings.");
      return;
    }

    await work();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.log(stack || message, true);
    notifier.error(message);
  }
}
