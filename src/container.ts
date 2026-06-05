import * as vscode from "vscode";
import { DGroupCustomRuleRegistry } from "./application/customRules/dGroup/DGroupCustomRuleRegistry";
import { OperatorSpacingRule } from "./application/customRules/dGroup/OperatorSpacingRule";
import { TypeCastSpacingRule } from "./application/customRules/dGroup/TypeCastSpacingRule";
import { CustomRuleRunner } from "./application/services/CustomRuleRunner";
import { DocumentFormatPolicy } from "./application/policies/DocumentFormatPolicy";
import { FormattingWorkflow } from "./application/services/FormattingWorkflow";
import { FormatChangedFilesUseCase } from "./application/useCases/FormatChangedFilesUseCase";
import { FormatCurrentFileUseCase } from "./application/useCases/FormatCurrentFileUseCase";
import { FormatSavedDocumentUseCase } from "./application/useCases/FormatSavedDocumentUseCase";
import { OUTPUT_CHANNEL_NAME } from "./constants";
import { MixedHtmlDetector } from "./domain/mixedHtml/MixedHtmlDetector";
import { OperatorSpacingNormalizer } from "./domain/operatorSpacing/OperatorSpacingNormalizer";
import { TypeCastSpacingNormalizer } from "./domain/typeCastSpacing/TypeCastSpacingNormalizer";
import { ConfigService } from "./infrastructure/config/ConfigService";
import { GitChangeProvider } from "./infrastructure/git/GitChangeProvider";
import { Logger } from "./infrastructure/logging/Logger";
import { Notifier } from "./infrastructure/notification/Notifier";
import { VscodeDocumentService } from "./infrastructure/vscode/VscodeDocumentService";
import { VscodeOperatorSpacingFixer } from "./infrastructure/vscode/VscodeOperatorSpacingFixer";
import { VscodePhpFormatter } from "./infrastructure/vscode/VscodePhpFormatter";
import { VscodeTypeCastSpacingFixer } from "./infrastructure/vscode/VscodeTypeCastSpacingFixer";

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
  const typeCastSpacingNormalizer = new TypeCastSpacingNormalizer();
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
    documentService,
    logger,
    normalizer: operatorSpacingNormalizer,
  });
  const typeCastSpacingFixer = new VscodeTypeCastSpacingFixer({
    documentService,
    logger,
    normalizer: typeCastSpacingNormalizer,
  });
  const customRuleRegistry = new DGroupCustomRuleRegistry({
    config,
    rules: [
      new OperatorSpacingRule({
        config,
        fixer: operatorSpacingFixer,
      }),
      new TypeCastSpacingRule({
        config,
        fixer: typeCastSpacingFixer,
      }),
    ],
  });
  const customRuleRunner = new CustomRuleRunner({
    registry: customRuleRegistry,
  });
  const workflow = new FormattingWorkflow({
    customRuleRunner,
    documentPolicy,
    documentService,
    formatter,
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
