import * as vscode from "vscode";
import { ConfigReader, LoggerLike } from "../../domain/types/services";

/**
 * Writes messages to the extension output channel.
 */
export class Logger implements LoggerLike {
  private readonly output: vscode.OutputChannel;
  private readonly config: ConfigReader;

  constructor(output: vscode.OutputChannel, config: ConfigReader) {
    this.output = output;
    this.config = config;
  }

  /**
   * Writes a message when debug mode is enabled, or when forced by `always`.
   */
  log(message: string, always = false): void {
    if (always || this.config.isDebugEnabled()) {
      this.output.appendLine(message);
    }
  }
}
