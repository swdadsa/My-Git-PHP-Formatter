import * as vscode from "vscode";

export type ChangedRange = {
  startLine: number;
  endLine: number;
};

export type ChangedPhpFile = {
  relativePath: string;
  uri: vscode.Uri;
  isNew: boolean;
  ranges: ChangedRange[];
};

export type DocumentChangeInfo = {
  hasChanges: boolean;
  isNew: boolean;
  ranges: ChangedRange[];
};

export type FormatTargetInfo = {
  isNew: boolean;
  ranges: ChangedRange[];
};

export type FormatChangedFilesResult = {
  formattedCount: number;
  skippedCount: number;
};

export type FormatDocumentResult = {
  changed: boolean;
  skipped: boolean;
};

export type OperatorSpacingEdit = {
  operator: string;
  startOffset: number;
  endOffset: number;
  lineStarts: number[];
};

export type OffsetRange = {
  startOffset: number;
  endOffset: number;
};
