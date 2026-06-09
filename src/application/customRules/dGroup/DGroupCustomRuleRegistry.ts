import {
  ConfigReader,
  CustomFormattingRuleLike,
  CustomRuleRegistryLike,
} from "../../../domain/types/services";
import { D_GROUP_CUSTOM_RULE_MODES } from "../../../constants";

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
   * Returns D group rules according to the selected mode.
   */
  getEnabledRules(): CustomFormattingRuleLike[] {
    const mode = this.config.getDGroupCustomRulesMode();

    if (mode === D_GROUP_CUSTOM_RULE_MODES.off) {
      return [];
    }

    if (mode === D_GROUP_CUSTOM_RULE_MODES.all) {
      return this.rules;
    }

    const enabledRuleIds = new Set(this.config.getDGroupEnabledRuleIds());

    return this.rules.filter((rule) => enabledRuleIds.has(rule.id));
  }
}
