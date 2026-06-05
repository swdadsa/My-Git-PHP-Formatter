import * as vscode from "vscode";
import { FormatTargetInfo } from "../../../domain/types/formatting";
import {
  ConfigReader,
  CustomFormattingRuleLike,
  TypeCastSpacingFixerLike,
} from "../../../domain/types/services";

type TypeCastSpacingRuleDependencies = {
  config: ConfigReader;
  fixer: TypeCastSpacingFixerLike;
};

/**
 * D group rule that normalizes spacing around PHP type casts.
 */
export class TypeCastSpacingRule implements CustomFormattingRuleLike {
  readonly id = "dGroup.typeCastSpacing";

  private readonly config: ConfigReader;
  private readonly fixer: TypeCastSpacingFixerLike;

  constructor({ config, fixer }: TypeCastSpacingRuleDependencies) {
    this.config = config;
    this.fixer = fixer;
  }

  /**
   * Returns whether this individual D group rule is enabled.
   */
  isEnabled(): boolean {
    return this.config.shouldRunDGroupTypeCastSpacingRule();
  }

  /**
   * Applies the type cast spacing fixer to the formatted target.
   */
  async apply(document: vscode.TextDocument, info: FormatTargetInfo): Promise<boolean> {
    return this.fixer.normalize(document, info);
  }
}
