import { ChangedRange, OffsetRange, TypeCastSpacingEdit } from "../types/formatting";

const CODE_STATE = "code";
const DOUBLE_QUOTE_STATE = "doubleQuote";
const HEREDOC_STATE = "heredoc";
const LINE_COMMENT_STATE = "lineComment";
const BLOCK_COMMENT_STATE = "blockComment";
const SINGLE_QUOTE_STATE = "singleQuote";

const DEFAULT_CAST_TYPES = [
  "array",
  "bool",
  "boolean",
  "double",
  "float",
  "int",
  "integer",
  "object",
  "real",
  "string",
  "unset",
] as const;

type ScannerState =
  | typeof CODE_STATE
  | typeof DOUBLE_QUOTE_STATE
  | typeof HEREDOC_STATE
  | typeof LINE_COMMENT_STATE
  | typeof BLOCK_COMMENT_STATE
  | typeof SINGLE_QUOTE_STATE;

type ScannerResult = {
  state: ScannerState;
  heredocTerminator: string | null;
  nextIndex: number;
};

type HeredocStart = {
  terminator: string;
  nextIndex: number;
};

type TypeCastMatch = {
  castType: string;
  closeParenOffset: number;
};

/**
 * Finds safe type cast spacing edits inside PHP code ranges.
 */
export class TypeCastSpacingNormalizer {
  private readonly castTypes: Set<string>;

  constructor({ castTypes = DEFAULT_CAST_TYPES }: { castTypes?: readonly string[] } = {}) {
    this.castTypes = new Set(castTypes.map((castType) => castType.toLowerCase()));
  }

  /**
   * Builds offset-based edits without touching strings, comments, or heredoc blocks.
   */
  buildEdits(text: string, ranges: ChangedRange[]): TypeCastSpacingEdit[] {
    const lineStarts = getLineStarts(text);
    const targetOffsets = rangesToOffsets(ranges, lineStarts, text.length);
    const hasPhpTags = text.includes("<?");
    let inPhp = !hasPhpTags;
    let state: ScannerState = CODE_STATE;
    let heredocTerminator: string | null = null;
    const edits: TypeCastSpacingEdit[] = [];

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

      if (state === CODE_STATE && text[index] === "(") {
        const edit = createTypeCastEdit(text, index, this.castTypes, targetOffsets, lineStarts);
        if (edit) {
          edits.push(edit);
          index = edit.endOffset - 1;
        }
      }
    }

    return edits;
  }
}

/**
 * Moves the scanner through strings, comments, and heredoc blocks.
 */
function advanceScannerState(
  text: string,
  index: number,
  state: ScannerState,
  heredocTerminator: string | null
): ScannerResult {
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
function enterIgnoredState(
  text: string,
  index: number,
  heredocTerminator: string | null
): ScannerResult {
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
function advanceSingleQuotedString(text: string, index: number): ScannerResult {
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
function advanceDoubleQuotedString(text: string, index: number): ScannerResult {
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
function advanceHeredoc(
  text: string,
  index: number,
  heredocTerminator: string | null
): ScannerResult {
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
 * Creates a replacement edit for one type cast when it is inside a changed range.
 */
function createTypeCastEdit(
  text: string,
  openParenOffset: number,
  castTypes: Set<string>,
  targetOffsets: OffsetRange[],
  lineStarts: number[]
): TypeCastSpacingEdit | null {
  if (!isOffsetInRanges(openParenOffset, targetOffsets)) {
    return null;
  }

  const match = readTypeCast(text, openParenOffset, castTypes);
  if (!match) {
    return null;
  }

  const endOffset = findWhitespaceEnd(text, match.closeParenOffset + 1);
  const nextToken = text[endOffset] || "";
  if (!canFollowTypeCast(nextToken)) {
    return null;
  }

  const replacement = `(${match.castType}) `;

  if (text.slice(openParenOffset, endOffset) === replacement) {
    return null;
  }

  return {
    replacement,
    startOffset: openParenOffset,
    endOffset,
    lineStarts,
  };
}

/**
 * Reads a PHP type cast such as `( int )` or `(string)`.
 */
function readTypeCast(
  text: string,
  openParenOffset: number,
  castTypes: Set<string>
): TypeCastMatch | null {
  let cursor = openParenOffset + 1;
  cursor = skipHorizontalWhitespace(text, cursor);

  const typeStart = cursor;
  while (cursor < text.length && /[A-Za-z]/.test(text[cursor])) {
    cursor += 1;
  }

  if (cursor === typeStart) {
    return null;
  }

  const castType = text.slice(typeStart, cursor).toLowerCase();
  if (!castTypes.has(castType)) {
    return null;
  }

  cursor = skipHorizontalWhitespace(text, cursor);
  if (text[cursor] !== ")") {
    return null;
  }

  return {
    castType,
    closeParenOffset: cursor,
  };
}

/**
 * Converts 1-based line ranges to offset ranges.
 */
function rangesToOffsets(
  ranges: ChangedRange[],
  lineStarts: number[],
  textLength: number
): OffsetRange[] {
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
export function getLineStarts(text: string): number[] {
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
function getLineEndOffset(lineStarts: number[], lineIndex: number, textLength: number): number {
  const nextLineStart = lineStarts[lineIndex + 1];
  if (nextLineStart === undefined) {
    return textLength;
  }

  return Math.max(nextLineStart - 1, lineStarts[lineIndex] || 0);
}

/**
 * Returns whether an offset is inside any target range.
 */
function isOffsetInRanges(offset: number, ranges: OffsetRange[]): boolean {
  return ranges.some((range) => offset >= range.startOffset && offset <= range.endOffset);
}

/**
 * Skips horizontal whitespace characters from an offset.
 */
function skipHorizontalWhitespace(text: string, offset: number): number {
  let cursor = offset;
  while (cursor < text.length && isHorizontalWhitespace(text[cursor])) {
    cursor += 1;
  }
  return cursor;
}

/**
 * Finds the first non-horizontal-whitespace character after a token.
 */
function findWhitespaceEnd(text: string, offset: number): number {
  let end = offset;
  while (end < text.length && isHorizontalWhitespace(text[end])) {
    end += 1;
  }
  return end;
}

/**
 * Returns whether the next token can plausibly be the expression being cast.
 */
function canFollowTypeCast(character: string): boolean {
  if (!character || ["\r", "\n", ";", ",", ")", "]", "}", ".", ":"].includes(character)) {
    return false;
  }

  return true;
}

/**
 * Skips past `<?php`, `<?=`, or short open tags.
 */
function skipPhpOpenTag(text: string, tagStart: number): number {
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

/**
 * Returns whether the character is a space or tab.
 */
function isHorizontalWhitespace(character: string): boolean {
  return character === " " || character === "\t";
}
