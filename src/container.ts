import * as vscode from "vscode";
import { DocumentFormatPolicy } from "./application/policies/DocumentFormatPolicy";
import { FormattingWorkflow } from "./application/services/FormattingWorkflow";
import { FormatChangedFilesUseCase } from "./application/useCases/FormatChangedFilesUseCase";
import { FormatCurrentFileUseCase } from "./application/useCases/FormatCurrentFileUseCase";
import { FormatSavedDocumentUseCase } from "./application/useCases/FormatSavedDocumentUseCase";
import { OUTPUT_CHANNEL_NAME } from "./constants";
import { MixedHtmlDetector } from "./domain/mixedHtml/MixedHtmlDetector";
import { OperatorSpacingNormalizer } from "./domain/operatorSpacing/OperatorSpacingNormalizer";
import { ConfigService } from "./infrastructure/config/ConfigService";
import { GitChangeProvider } from "./infrastructure/git/GitChangeProvider";
import { Logger } from "./infrastructure/logging/Logger";
import { Notifier } from "./infrastructure/notification/Notifier";
import { VscodeDocumentService } from "./infrastructure/vscode/VscodeDocumentService";
import { VscodeOperatorSpacingFixer } from "./infrastructure/vscode/VscodeOperatorSpacingFixer";
import { VscodePhpFormatter } from "./infrastructure/vscode/VscodePhpFormatter";

export type ExtensionServices = {
  config: ConfigService;
  documentService: VscodeDocumentService;
  logger: Logger;
  notifier: Notifier;
  output: vscode.OutputChannel;
  useCases: {
    formatChangedFiles: FormatChangedFilesUseCase;
    formatCurrentFile: FormatCurrentFileUseCase;
    formatSavedDocument: FormatSavedDocumentUseCase;
  };
};

/**
 * Creates and wires the extension services without introducing a DI framework.
 */
export function createExtensionServices(): ExtensionServices {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  const config = new ConfigService();
  const logger = new Logger(output, config);
  const notifier = new Notifier(config);
  const documentService = new VscodeDocumentService();
  const gitChangeProvider = new GitChangeProvider(logger);
  const mixedHtmlDetector = new MixedHtmlDetector();
  const operatorSpacingNormalizer = new OperatorSpacingNormalizer();
  const documentPolicy = new DocumentFormatPolicy({
    config,
    logger,
    mixedHtmlDetector,
  });
  const formatter = new VscodePhpFormatter({
    documentService,
    logger,
  });
  const operatorSpacingFixer = new VscodeOperatorSpacingFixer({
    config,
    documentService,
    logger,
    normalizer: operatorSpacingNormalizer,
  });
  const workflow = new FormattingWorkflow({
    documentPolicy,
    documentService,
    formatter,
    operatorSpacingFixer,
  });
  const useCases = {
    formatChangedFiles: new FormatChangedFilesUseCase({
      gitChangeProvider,
      notifier,
      workflow,
    }),
    formatCurrentFile: new FormatCurrentFileUseCase({
      documentService,
      gitChangeProvider,
      notifier,
      workflow,
    }),
    formatSavedDocument: new FormatSavedDocumentUseCase({
      gitChangeProvider,
      workflow,
    }),
  };

  return {
    config,
    documentService,
    logger,
    notifier,
    output,
    useCases,
  };
}
