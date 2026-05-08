/**
 * Writes messages to the extension output channel.
 */
class Logger {
  constructor(output, config) {
    this.output = output;
    this.config = config;
  }

  /**
   * Writes a message when debug mode is enabled, or when forced by `always`.
   */
  log(message, always = false) {
    if (always || this.config.isDebugEnabled()) {
      this.output.appendLine(message);
    }
  }
}

module.exports = {
  Logger,
};
