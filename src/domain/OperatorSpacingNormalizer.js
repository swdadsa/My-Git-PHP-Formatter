const CODE_STATE = "code";
const DOUBLE_QUOTE_STATE = "doubleQuote";
const HEREDOC_STATE = "heredoc";
const LINE_COMMENT_STATE = "lineComment";
const BLOCK_COMMENT_STATE = "blockComment";
const SINGLE_QUOTE_STATE = "singleQuote";

const DEFAULT_OPERATORS = [
  "!==",
  "===",
  "=>",
  "==",
  "!=",
  "<=",
  ">=",
  "??",
  "&&",
  "||",
  "=",
  "<",
  ">",
];

/**
 * Finds safe operator spacing edits inside PHP code ranges.
 */
class OperatorSpacingNormalizer {
  constructor({ operators = DEFAULT_OPERATORS } = {}) {
    this.operators = [...operators].sort((left, right) => right.length - left.length);
  }

  /**
   * Builds offset-based edits without touching strings, comments, or heredoc blocks.
   */
  buildEdits(text, ranges) {
    const lineStarts = getLineStarts(text);
    const targetOffsets = rangesToOffsets(ranges, lineStarts, text.length);
    const hasPhpTags = text.includes("<?");
    let inPhp = !hasPhpTags;
    let state = CODE_STATE;
    let heredocTerminator = null;
    const edits = [];

    for (let index = 0; index < text.length; index += 1) {
      if (!inPhp) {
        const tagStart = text.indexOf("<?", index);
        if (tagStart === -1) {
          break;
        }

        index = skipPhpOpenTag(text, tagStart);
        inPhp = true;
        continue;
      }

      if (state === CODE_STATE && text.startsWith("?>", index)) {
        inPhp = false;
        index += 1;
        continue;
      }

      const stateResult = advanceScannerState(text, index, state, heredocTerminator);
      state = stateResult.state;
      heredocTerminator = stateResult.heredocTerminator;

      if (stateResult.nextIndex !== index) {
        index = stateResult.nextIndex;
        continue;
      }

      const operator = findOperatorAt(text, index, this.operators);
      if (state === CODE_STATE && operator) {
        const edit = createOperatorEdit(text, index, operator, targetOffsets, lineStarts);
        if (edit) {
          edits.push(edit);
        }

        index += operator.length - 1;
      }
    }

    return edits;
  }
}

/**
 * Returns changed ranges for modified files, or the whole document for new files.
 */
function getTargetRanges(document, info) {
  if (!info.isNew) {
    return info.ranges;
  }

  return [
    {
      startLine: 1,
      endLine: Math.max(document.lineCount, 1),
    },
  ];
}

/**
 * Moves the scanner through strings, comments, and heredoc blocks.
 */
function advanceScannerState(text, index, state, heredocTerminator) {
  switch (state) {
    case SINGLE_QUOTE_STATE:
      return advanceSingleQuotedString(text, index);
    case DOUBLE_QUOTE_STATE:
      return advanceDoubleQuotedString(text, index);
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
      return enterIgnoredState(text, index, heredocTerminator);
  }
}

/**
 * Enters a string/comment/heredoc state when code scanning reaches one.
 */
function enterIgnoredState(text, index, heredocTerminator) {
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
 * Skips through a single quoted PHP string.
 */
function advanceSingleQuotedString(text, index) {
  if (text[index] !== "'") {
    return { state: SINGLE_QUOTE_STATE, heredocTerminator: null, nextIndex: index };
  }

  return isEscaped(text, index)
    ? { state: SINGLE_QUOTE_STATE, heredocTerminator: null, nextIndex: index }
    : { state: CODE_STATE, heredocTerminator: null, nextIndex: index };
}

/**
 * Skips through a double quoted PHP string.
 */
function advanceDoubleQuotedString(text, index) {
  if (text[index] !== "\"") {
    return { state: DOUBLE_QUOTE_STATE, heredocTerminator: null, nextIndex: index };
  }

  return isEscaped(text, index)
    ? { state: DOUBLE_QUOTE_STATE, heredocTerminator: null, nextIndex: index }
    : { state: CODE_STATE, heredocTerminator: null, nextIndex: index };
}

/**
 * Leaves heredoc/nowdoc mode when the terminator appears at the start of a line.
 */
function advanceHeredoc(text, index, heredocTerminator) {
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
function readHeredocStart(text, index) {
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
 * Returns the configured operator that starts at an offset.
 */
function findOperatorAt(text, offset, operators) {
  return operators.find((operator) => (
    text.startsWith(operator, offset) && isStandaloneOperator(text, offset, operator)
  ));
}

/**
 * Avoids treating pieces of longer operators as standalone operators.
 */
function isStandaloneOperator(text, offset, operator) {
  const before = text[offset - 1] || "";
  const after = text[offset + operator.length] || "";

  if (operator === "=") {
    return !["=", ">", "<", "!", "+", "-", "*", "/", "%", ".", "?", ":"].includes(before) &&
      !["=", ">"].includes(after);
  }

  if (operator === "<") {
    return !["<", "="].includes(after) && before !== "<";
  }

  if (operator === ">") {
    return ![">", "="].includes(after) && before !== "-";
  }

  if (operator === "??") {
    return after !== "=";
  }

  return true;
}

/**
 * Creates a replacement edit for one operator when it is inside a changed range.
 */
function createOperatorEdit(text, operatorOffset, operator, targetOffsets, lineStarts) {
  if (!isOffsetInRanges(operatorOffset, targetOffsets)) {
    return null;
  }

  const startOffset = findWhitespaceStart(text, operatorOffset);
  const endOffset = findWhitespaceEnd(text, operatorOffset + operator.length);

  if (text.slice(startOffset, endOffset) === ` ${operator} `) {
    return null;
  }

  return {
    operator,
    startOffset,
    endOffset,
    lineStarts,
  };
}

/**
 * Converts 1-based line ranges to offset ranges.
 */
function rangesToOffsets(ranges, lineStarts, textLength) {
  return ranges.map((range) => {
    const startLineIndex = Math.max(range.startLine - 1, 0);
    const endLineIndex = Math.max(range.endLine - 1, startLineIndex);
    const startOffset = lineStarts[startLineIndex] ?? textLength;
    const endOffset = getLineEndOffset(lineStarts, endLineIndex, textLength);

    return { startOffset, endOffset };
  });
}

/**
 * Returns all line-start offsets in a document.
 */
function getLineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      starts.push(index + 1);
    }
  }
  return starts;
}

/**
 * Returns the offset at the end of a 0-based line.
 */
function getLineEndOffset(lineStarts, lineIndex, textLength) {
  const nextLineStart = lineStarts[lineIndex + 1];
  if (nextLineStart === undefined) {
    return textLength;
  }

  return Math.max(nextLineStart - 1, lineStarts[lineIndex] || 0);
}

/**
 * Returns whether an offset is inside any target range.
 */
function isOffsetInRanges(offset, ranges) {
  return ranges.some((range) => offset >= range.startOffset && offset <= range.endOffset);
}

/**
 * Finds the first horizontal whitespace character before a token.
 */
function findWhitespaceStart(text, offset) {
  let start = offset;
  while (start > 0 && isHorizontalWhitespace(text[start - 1])) {
    start -= 1;
  }
  return start;
}

/**
 * Finds the first non-horizontal-whitespace character after a token.
 */
function findWhitespaceEnd(text, offset) {
  let end = offset;
  while (end < text.length && isHorizontalWhitespace(text[end])) {
    end += 1;
  }
  return end;
}

/**
 * Skips past `<?php`, `<?=`, or short open tags.
 */
function skipPhpOpenTag(text, tagStart) {
  if (text.startsWith("<?php", tagStart)) {
    return tagStart + 4;
  }

  if (text.startsWith("<?=", tagStart)) {
    return tagStart + 2;
  }

  return tagStart + 1;
}

/**
 * Returns the offset of the line break after index.
 */
function findLineEnd(text, index) {
  const lineEnd = text.indexOf("\n", index);
  return lineEnd === -1 ? text.length : lineEnd;
}

/**
 * Returns whether an offset starts a new line.
 */
function isLineStart(text, index) {
  return index === 0 || text[index - 1] === "\n";
}

/**
 * Returns whether a quote is escaped by an odd number of backslashes.
 */
function isEscaped(text, index) {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

/**
 * Returns whether the character is a space or tab.
 */
function isHorizontalWhitespace(character) {
  return character === " " || character === "\t";
}

module.exports = {
  OperatorSpacingNormalizer,
  getLineStarts,
  getTargetRanges,
};
