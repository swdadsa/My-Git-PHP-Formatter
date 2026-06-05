import * as vscode from "vscode";
import {
  ChangedPhpFile,
  ChangedRange,
  DocumentChangeInfo,
  FormatDocumentResult,
  FormatTargetInfo,
  OperatorSpacingEdit,
  TypeCastSpacingEdit,
} from "./formatting";

export interface ConfigReader {
  isDebugEnabled(): boolean;
  isExtensionEnabled(): boolean;
  shouldFormatOnSave(): boolean;
  shouldRunDGroupCustomRules(): boolean;
  shouldRunDGroupOperatorSpacingRule(): boolean;
  shouldRunDGroupTypeCastSpacingRule(): boolean;
  shouldShowNotifications(): boolean;
  shouldSkipMixedHtmlDocuments(): boolean;
}

export interface LoggerLike {
  log(message: string, always?: boolean): void;
}

export interface NotifierLike {
  info(message: string): void;
  warning(message: string): void;
  error(message: string): void;
}

export interface DocumentServiceLike {
  getActivePhpDocument(): vscode.TextDocument | undefined;
  isPhpFileDocument(document: vscode.TextDocument): boolean;
  openDocument(uri: vscode.Uri): Thenable<vscode.TextDocument>;
}

export interface GitChangeProviderLike {
  collectChangedPhpFiles(workspaceFolders: readonly vscode.WorkspaceFolder[]): Promise<ChangedPhpFile[]>;
  getDocumentChangeInfo(uri: vscode.Uri): Promise<DocumentChangeInfo | null>;
}

export interface PhpFormatterLike {
  formatWholeDocument(document: vscode.TextDocument): Promise<boolean>;
  formatChangedRanges(document: vscode.TextDocument, ranges: ChangedRange[]): Promise<boolean>;
}

export interface OperatorSpacingFixerLike {
  normalize(document: vscode.TextDocument, info: FormatTargetInfo): Promise<boolean>;
}

export interface OperatorSpacingNormalizerLike {
  buildEdits(text: string, ranges: ChangedRange[]): OperatorSpacingEdit[];
}

export interface TypeCastSpacingFixerLike {
  normalize(document: vscode.TextDocument, info: FormatTargetInfo): Promise<boolean>;
}

export interface TypeCastSpacingNormalizerLike {
  buildEdits(text: string, ranges: ChangedRange[]): TypeCastSpacingEdit[];
}

export interface CustomFormattingRuleLike {
  readonly id: string;
  apply(document: vscode.TextDocument, info: FormatTargetInfo): Promise<boolean>;
  isEnabled(): boolean;
}

export interface CustomRuleRegistryLike {
  getEnabledRules(): CustomFormattingRuleLike[];
}

export interface CustomRuleRunnerLike {
  apply(document: vscode.TextDocument, info: FormatTargetInfo): Promise<boolean>;
}

export interface DocumentFormatPolicyLike {
  shouldSkip(document: vscode.TextDocument): boolean;
}

export interface FormattingWorkflowLike {
  formatChangedFileEntries(changedFiles: ChangedPhpFile[]): Promise<{
    formattedCount: number;
    skippedCount: number;
  }>;
  formatDocument(
    document: vscode.TextDocument,
    info: FormatTargetInfo
  ): Promise<FormatDocumentResult>;
}

export interface FormatSavedDocumentUseCaseLike {
  execute(document: vscode.TextDocument): Promise<boolean>;
}
