import * as vscode from "vscode";
import { FormatTargetInfo } from "../../domain/types/formatting";
import { CustomRuleRegistryLike, CustomRuleRunnerLike } from "../../domain/types/services";

type CustomRuleRunnerDependencies = {
  registry: CustomRuleRegistryLike;
};

/**
 * Runs all enabled custom formatting rules after the main formatter has finished.
 */
export class CustomRuleRunner implements CustomRuleRunnerLike {
  private readonly registry: CustomRuleRegistryLike;

  constructor({ registry }: CustomRuleRunnerDependencies) {
    this.registry = registry;
  }

  /**
   * Applies enabled custom rules and reports whether any rule changed the document.
   */
  async apply(document: vscode.TextDocument, info: FormatTargetInfo): Promise<boolean> {
    let changed = false;

    for (const rule of this.registry.getEnabledRules()) {
      const ruleChanged = await rule.apply(document, info);
      changed = changed || ruleChanged;
    }

    return changed;
  }
}
