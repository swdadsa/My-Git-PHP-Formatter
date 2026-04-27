const { isDebugEnabled } = require("./config");

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
