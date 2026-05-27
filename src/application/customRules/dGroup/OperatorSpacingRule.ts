import * as vscode from "vscode";
import { FormatTargetInfo } from "../../../domain/types/formatting";
import {
  ConfigReader,
  CustomFormattingRuleLike,
  OperatorSpacingFixerLike,
} from "../../../domain/types/services";

type OperatorSpacingRuleDependencies = {
  config: ConfigReader;
  fixer: OperatorSpacingFixerLike;
};

/**
 * D group rule that normalizes spacing around selected PHP operators.
 */
export class OperatorSpacingRule implements CustomFormattingRuleLike {
  readonly id = "dGroup.operatorSpacing";

  private readonly config: ConfigReader;
  private readonly fixer: OperatorSpacingFixerLike;

  constructor({ config, fixer }: OperatorSpacingRuleDependencies) {
    this.config = config;
    this.fixer = fixer;
  }

  /**
   * Returns whether this individual D group rule is enabled.
   */
  isEnabled(): boolean {
    return this.config.shouldRunDGroupOperatorSpacingRule();
  }

  /**
   * Applies the operator spacing fixer to the formatted target.
   */
  async apply(document: vscode.TextDocument, info: FormatTargetInfo): Promise<boolean> {
    return this.fixer.normalize(document, info);
  }
}
