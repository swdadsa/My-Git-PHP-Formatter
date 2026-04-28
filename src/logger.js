const { isDebugEnabled } = require("./config");

/**
 * Creates a logger that writes to the output channel only when needed.
 */
function createLogger(output) {
  return (message, always = false) => {
    if (always || isDebugEnabled()) {
      output.appendLine(message);
    }
  };
}

module.exports = {
  createLogger,
};
