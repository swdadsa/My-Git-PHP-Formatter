import * as vscode from "vscode";
import { D_GROUP_RULE_IDS } from "../../../constants";
import { FormatTargetInfo } from "../../../domain/types/formatting";
import {
  CustomFormattingRuleLike,
  OperatorSpacingFixerLike,
} from "../../../domain/types/services";

type OperatorSpacingRuleDependencies = {
  fixer: OperatorSpacingFixerLike;
};

/**
 * D group rule that normalizes spacing around selected PHP operators.
 */
export class OperatorSpacingRule implements CustomFormattingRuleLike {
  readonly id = D_GROUP_RULE_IDS.operatorSpacing;

  private readonly fixer: OperatorSpacingFixerLike;

  constructor({ fixer }: OperatorSpacingRuleDependencies) {
    this.fixer = fixer;
  }

  /**
   * Applies the operator spacing fixer to the formatted target.
   */
  async apply(document: vscode.TextDocument, info: FormatTargetInfo): Promise<boolean> {
    return this.fixer.normalize(document, info);
  }
}
