const vscode = require("vscode");
const { OUTPUT_CHANNEL_NAME } = require("./constants");
const { DocumentFormatPolicy } = require("./application/policies/DocumentFormatPolicy");
const { FormatChangedFilesUseCase } = require("./application/useCases/FormatChangedFilesUseCase");
const { FormatCurrentFileUseCase } = require("./application/useCases/FormatCurrentFileUseCase");
const { FormatSavedDocumentUseCase } = require("./application/useCases/FormatSavedDocumentUseCase");
const { FormattingWorkflow } = require("./application/services/FormattingWorkflow");
const { MixedHtmlDetector } = require("./domain/mixedHtml/MixedHtmlDetector");
const { OperatorSpacingNormalizer } = require("./domain/operatorSpacing/OperatorSpacingNormalizer");
const { ConfigService } = require("./infrastructure/config/ConfigService");
const { GitChangeProvider } = require("./infrastructure/git/GitChangeProvider");
const { Logger } = require("./infrastructure/logging/Logger");
const { Notifier } = require("./infrastructure/notification/Notifier");
const { VscodeDocumentService } = require("./infrastructure/vscode/VscodeDocumentService");
const { VscodeOperatorSpacingFixer } = require("./infrastructure/vscode/VscodeOperatorSpacingFixer");
const { VscodePhpFormatter } = require("./infrastructure/vscode/VscodePhpFormatter");

/**
 * Creates and wires the extension services without introducing a DI framework.
 */
function createExtensionServices() {
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

module.exports = {
  createExtensionServices,
};
