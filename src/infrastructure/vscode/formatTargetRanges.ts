import * as vscode from "vscode";
import { ChangedRange, FormatTargetInfo } from "../../domain/types/formatting";

/**
 * Returns changed ranges for modified files, or the whole document for new files.
 */
export function getTargetRanges(
  document: vscode.TextDocument,
  info: FormatTargetInfo
): ChangedRange[] {
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
