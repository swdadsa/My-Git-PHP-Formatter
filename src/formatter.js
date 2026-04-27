const vscode = require("vscode");

const MIXED_HTML_TAG_THRESHOLD = 4;
const PHP_BLOCK_PATTERN = /<\?(?:php|=)?[\s\S]*?\?>/gi;
const HTML_TAG_PATTERN = /<\/?[a-z][\w:-]*(?:\s[^<>]*?)?>/gi;

function isPhpFileDocument(document) {
  return document.uri.scheme === "file" && document.languageId === "php";
}

function isLikelyMixedHtmlDocument(document) {
  if (!isPhpFileDocument(document)) {
    return false;
  }

  const nonPhpSegments = document.getText().replace(PHP_BLOCK_PATTERN, "\n");
  const tagMatches = nonPhpSegments.match(HTML_TAG_PATTERN) || [];

  return tagMatches.length >= MIXED_HTML_TAG_THRESHOLD;
}

async function formatDocumentWhole(document, log) {
  if (!isPhpFileDocument(document)) {
    return false;
  }

  const edits = await vscode.commands.executeCommand(
    "vscode.executeFormatDocumentProvider",
    document.uri,
    getFormattingOptions(document)
  );

  log(`Formatting whole document: ${document.uri.fsPath}`);
  return applyEditsAndSave(document, edits);
}

async function formatChangedDocument(document, ranges, log) {
  if (!isPhpFileDocument(document) || ranges.length === 0) {
    return false;
  }

  let hasChanges = false;

  // Range edits are applied from bottom to top so earlier edits do not shift
  // the line numbers of later diff hunks.
  const descending = [...ranges].sort((left, right) => right.startLine - left.startLine);

  for (const rangeInfo of descending) {
    const activeDocument = await vscode.workspace.openTextDocument(document.uri);
    const startLineIndex = Math.max(rangeInfo.startLine - 1, 0);
    const endLineIndex = Math.min(rangeInfo.endLine - 1, activeDocument.lineCount - 1);

    if (startLineIndex > endLineIndex || endLineIndex < 0) {
      continue;
    }

    const endCharacter = activeDocument.lineAt(endLineIndex).text.length;
    const range = new vscode.Range(
      new vscode.Position(startLineIndex, 0),
      new vscode.Position(endLineIndex, endCharacter)
    );

    log(
      `Formatting changed range ${rangeInfo.startLine}-${rangeInfo.endLine} in ${activeDocument.uri.fsPath}`
    );

    const edits = await vscode.commands.executeCommand(
      "vscode.executeFormatRangeProvider",
      activeDocument.uri,
      range,
      getFormattingOptions(activeDocument)
    );

    const applied = await applyEdits(activeDocument.uri, edits);
    if (applied) {
      hasChanges = true;
    }
  }

  if (!hasChanges) {
    return false;
  }

  const latestDocument = await vscode.workspace.openTextDocument(document.uri);
  await latestDocument.save();
  return true;
}

async function applyEditsAndSave(document, edits) {
  const applied = await applyEdits(document.uri, edits);
  if (!applied) {
    return false;
  }

  const latestDocument = await vscode.workspace.openTextDocument(document.uri);
  await latestDocument.save();
  return true;
}

async function applyEdits(uri, edits) {
  if (!Array.isArray(edits) || edits.length === 0) {
    return false;
  }

  const workspaceEdit = new vscode.WorkspaceEdit();
  workspaceEdit.set(uri, edits);
  return vscode.workspace.applyEdit(workspaceEdit);
}

function getFormattingOptions(document) {
  const editorConfig = vscode.workspace.getConfiguration("editor", document.uri);
  const tabSize = editorConfig.get("tabSize");

  return {
    tabSize: typeof tabSize === "number" ? tabSize : 4,
    insertSpaces: editorConfig.get("insertSpaces", true),
  };
}

module.exports = {
  formatChangedDocument,
  formatDocumentWhole,
  isLikelyMixedHtmlDocument,
  isPhpFileDocument,
};
