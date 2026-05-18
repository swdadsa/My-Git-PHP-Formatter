const DEFAULT_HTML_TAG_THRESHOLD = 4;
const HTML_TAG_PATTERN = /<\/?[a-z][\w:-]*(?:\s[^<>]*?)?>/gi;

const CODE_STATE = "code";
const SINGLE_QUOTE_STATE = "singleQuote";
const DOUBLE_QUOTE_STATE = "doubleQuote";
const LINE_COMMENT_STATE = "lineComment";
const BLOCK_COMMENT_STATE = "blockComment";
const HEREDOC_STATE = "heredoc";

type PhpScannerState =
  | typeof CODE_STATE
  | typeof SINGLE_QUOTE_STATE
  | typeof DOUBLE_QUOTE_STATE
  | typeof LINE_COMMENT_STATE
  | typeof BLOCK_COMMENT_STATE
  | typeof HEREDOC_STATE;

type PhpScannerResult = {
  state: PhpScannerState;
  heredocTerminator: string | null;
  nextIndex: number;
};

type HeredocStart = {
  terminator: string;
  nextIndex: number;
};

/**
 * Detects PHP files where HTML markup is likely mixed into the document body.
 */
export class MixedHtmlDetector {
  private readonly htmlTagThreshold: number;

  constructor({ htmlTagThreshold = DEFAULT_HTML_TAG_THRESHOLD }: { htmlTagThreshold?: number } = {}) {
    this.htmlTagThreshold = htmlTagThreshold;
  }

  /**
   * Returns whether the text appears to contain substantial non-PHP HTML markup.
   */
  isLikelyMixedHtmlText(text: string): boolean {
    const outsidePhpText = extractOutsidePhpText(text);
    const tagMatches = outsidePhpText.match(HTML_TAG_PATTERN) || [];

    return tagMatches.length >= this.htmlTagThreshold;
  }
}

/**
 * Extracts only the text outside PHP blocks, ignoring PHP strings and comments.
 */
export function extractOutsidePhpText(text: string): string {
  let cursor = 0;
  let outsidePhpText = "";

  while (cursor < text.length) {
    const openTagIndex = text.indexOf("<?", cursor);
    if (openTagIndex === -1) {
      outsidePhpText += text.slice(cursor);
      break;
    }

    outsidePhpText += text.slice(cursor, openTagIndex);
    cursor = findPhpBlockEnd(text, skipPhpOpenTag(text, openTagIndex));

    if (cursor === -1) {
      break;
    }
  }

  return outsidePhpText;
}

/**
 * Finds the first real PHP close tag after an opening tag.
 */
function findPhpBlockEnd(text: string, startOffset: number): number {
  let state: PhpScannerState = CODE_STATE;
  let heredocTerminator: string | null = null;

  for (let index = startOffset; index < text.length; index += 1) {
    const stateResult = advancePhpState(text, index, state, heredocTerminator);
    state = stateResult.state;
    heredocTerminator = stateResult.heredocTerminator;

    if (stateResult.nextIndex !== index) {
      index = stateResult.nextIndex;
      continue;
    }

    if (state === CODE_STATE && text.startsWith("?>", index)) {
      return index + 2;
    }
  }

  return -1;
}

/**
 * Moves the PHP scanner through code, strings, comments, and heredoc blocks.
 */
function advancePhpState(
  text: string,
  index: number,
  state: PhpScannerState,
  heredocTerminator: string | null
): PhpScannerResult {
  switch (state) {
    case SINGLE_QUOTE_STATE:
      return advanceQuotedString(text, index, "'", SINGLE_QUOTE_STATE);
    case DOUBLE_QUOTE_STATE:
      return advanceQuotedString(text, index, "\"", DOUBLE_QUOTE_STATE);
    case LINE_COMMENT_STATE:
      return text[index] === "\n"
        ? { state: CODE_STATE, heredocTerminator, nextIndex: index }
        : { state, heredocTerminator, nextIndex: index };
    case BLOCK_COMMENT_STATE:
      return text.startsWith("*/", index)
        ? { state: CODE_STATE, heredocTerminator, nextIndex: index + 1 }
        : { state, heredocTerminator, nextIndex: index };
    case HEREDOC_STATE:
      return advanceHeredoc(text, index, heredocTerminator);
    default:
      return enterPhpIgnoredState(text, index, heredocTerminator);
  }
}

/**
 * Enters a PHP string/comment/heredoc state when code scanning reaches one.
 */
function enterPhpIgnoredState(
  text: string,
  index: number,
  heredocTerminator: string | null
): PhpScannerResult {
  if (text[index] === "'") {
    return { state: SINGLE_QUOTE_STATE, heredocTerminator, nextIndex: index };
  }

  if (text[index] === "\"") {
    return { state: DOUBLE_QUOTE_STATE, heredocTerminator, nextIndex: index };
  }

  if (text.startsWith("//", index) || text[index] === "#") {
    return { state: LINE_COMMENT_STATE, heredocTerminator, nextIndex: index };
  }

  if (text.startsWith("/*", index)) {
    return { state: BLOCK_COMMENT_STATE, heredocTerminator, nextIndex: index + 1 };
  }

  const heredoc = readHeredocStart(text, index);
  if (heredoc) {
    return {
      state: HEREDOC_STATE,
      heredocTerminator: heredoc.terminator,
      nextIndex: heredoc.nextIndex,
    };
  }

  return { state: CODE_STATE, heredocTerminator, nextIndex: index };
}

/**
 * Leaves a quoted string when an unescaped closing quote appears.
 */
function advanceQuotedString(
  text: string,
  index: number,
  quote: string,
  state: PhpScannerState
): PhpScannerResult {
  if (text[index] !== quote) {
    return { state, heredocTerminator: null, nextIndex: index };
  }

  return isEscaped(text, index)
    ? { state, heredocTerminator: null, nextIndex: index }
    : { state: CODE_STATE, heredocTerminator: null, nextIndex: index };
}

/**
 * Leaves heredoc/nowdoc mode when the terminator appears at the start of a line.
 */
function advanceHeredoc(
  text: string,
  index: number,
  heredocTerminator: string | null
): PhpScannerResult {
  if (!heredocTerminator) {
    return { state: CODE_STATE, heredocTerminator: null, nextIndex: index };
  }

  if (!isLineStart(text, index) || !text.startsWith(heredocTerminator, index)) {
    return { state: HEREDOC_STATE, heredocTerminator, nextIndex: index };
  }

  const afterTerminator = index + heredocTerminator.length;
  if (![";", "\r", "\n"].includes(text[afterTerminator] || "\n")) {
    return { state: HEREDOC_STATE, heredocTerminator, nextIndex: index };
  }

  return { state: CODE_STATE, heredocTerminator: null, nextIndex: afterTerminator };
}

/**
 * Reads a heredoc/nowdoc opening token and returns its terminator.
 */
function readHeredocStart(text: string, index: number): HeredocStart | null {
  if (!text.startsWith("<<<", index)) {
    return null;
  }

  const lineEnd = findLineEnd(text, index);
  const declaration = text.slice(index, lineEnd);
  const match = declaration.match(/^<<<\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/);
  if (!match) {
    return null;
  }

  return {
    terminator: match[1],
    nextIndex: lineEnd,
  };
}

/**
 * Skips past `<?php`, `<?=`, or short open tags.
 */
function skipPhpOpenTag(text: string, tagStart: number): number {
  if (text.startsWith("<?php", tagStart)) {
    return tagStart + 5;
  }

  if (text.startsWith("<?=", tagStart)) {
    return tagStart + 3;
  }

  return tagStart + 2;
}

/**
 * Returns the offset of the line break after index.
 */
function findLineEnd(text: string, index: number): number {
  const lineEnd = text.indexOf("\n", index);
  return lineEnd === -1 ? text.length : lineEnd;
}

/**
 * Returns whether an offset starts a new line.
 */
function isLineStart(text: string, index: number): boolean {
  return index === 0 || text[index - 1] === "\n";
}

/**
 * Returns whether a quote is escaped by an odd number of backslashes.
 */
function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}
