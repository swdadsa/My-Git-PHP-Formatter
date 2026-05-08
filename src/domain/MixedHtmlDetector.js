const DEFAULT_HTML_TAG_THRESHOLD = 4;
const PHP_BLOCK_PATTERN = /<\?(?:php|=)?[\s\S]*?\?>/gi;
const HTML_TAG_PATTERN = /<\/?[a-z][\w:-]*(?:\s[^<>]*?)?>/gi;

/**
 * Detects PHP files where HTML markup is likely mixed into the document body.
 */
class MixedHtmlDetector {
  constructor({ htmlTagThreshold = DEFAULT_HTML_TAG_THRESHOLD } = {}) {
    this.htmlTagThreshold = htmlTagThreshold;
  }

  /**
   * Returns whether the text appears to contain substantial non-PHP HTML markup.
   */
  isLikelyMixedHtmlText(text) {
    if (this.isPurePhpWithoutClosingTag(text)) {
      return false;
    }

    const nonPhpSegments = text.replace(PHP_BLOCK_PATTERN, "\n");
    const tagMatches = nonPhpSegments.match(HTML_TAG_PATTERN) || [];

    return tagMatches.length >= this.htmlTagThreshold;
  }

  /**
   * Treats files that start with `<?php` and never leave PHP mode as pure PHP.
   */
  isPurePhpWithoutClosingTag(text) {
    return text.trimStart().startsWith("<?php") && !text.includes("?>");
  }
}

module.exports = {
  MixedHtmlDetector,
};
