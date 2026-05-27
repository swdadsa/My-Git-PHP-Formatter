import {
  ConfigReader,
  CustomFormattingRuleLike,
  CustomRuleRegistryLike,
} from "../../../domain/types/services";

type DGroupCustomRuleRegistryDependencies = {
  config: ConfigReader;
  rules: CustomFormattingRuleLike[];
};

/**
 * Lists the D group custom rules that should run for the current configuration.
 */
export class DGroupCustomRuleRegistry implements CustomRuleRegistryLike {
  private readonly config: ConfigReader;
  private readonly rules: CustomFormattingRuleLike[];

  constructor({ config, rules }: DGroupCustomRuleRegistryDependencies) {
    this.config = config;
    this.rules = rules;
  }

  /**
   * Returns enabled D group rules only when the group-level switch is enabled.
   */
  getEnabledRules(): CustomFormattingRuleLike[] {
    if (!this.config.shouldRunDGroupCustomRules()) {
      return [];
    }

    return this.rules.filter((rule) => rule.isEnabled());
  }
}
