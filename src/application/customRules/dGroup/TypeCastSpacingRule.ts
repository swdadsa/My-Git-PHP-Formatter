import * as vscode from "vscode";
import { D_GROUP_RULE_IDS } from "../../../constants";
import { FormatTargetInfo } from "../../../domain/types/formatting";
import {
  CustomFormattingRuleLike,
  TypeCastSpacingFixerLike,
} from "../../../domain/types/services";

type TypeCastSpacingRuleDependencies = {
  fixer: TypeCastSpacingFixerLike;
};

/**
 * D group rule that normalizes spacing around PHP type casts.
 */
export class TypeCastSpacingRule implements CustomFormattingRuleLike {
  readonly id = D_GROUP_RULE_IDS.typeCastSpacing;

  private readonly fixer: TypeCastSpacingFixerLike;

  constructor({ fixer }: TypeCastSpacingRuleDependencies) {
    this.fixer = fixer;
  }

  /**
   * Applies the type cast spacing fixer to the formatted target.
   */
  async apply(document: vscode.TextDocument, info: FormatTargetInfo): Promise<boolean> {
    return this.fixer.normalize(document, info);
  }
}
