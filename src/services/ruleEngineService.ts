import config from '../config/personalization.json';
import { PersonalizationConfig, SegmentRule, TemplateRule, TemplateContent } from '../models/rules';
import { VALID_SEGMENTS } from '../models/entities';

const cfg = config as PersonalizationConfig;

/**
 * Evaluate segment rules against a set of signal fields.
 * Returns a map of segment -> new weight contribution from this signal.
 */
export function evaluateSegmentRules(fields: Record<string, string>): Record<string, number> {
  const weights: Record<string, number> = {};

  for (const rule of cfg.segmentRules) {
    const fieldValue = fields[rule.field];
    if (!fieldValue) continue;

    const match = matchRule(rule, fieldValue);
    if (match) {
      // Accumulate weights per segment from all matching rules
      weights[rule.segment] = (weights[rule.segment] || 0) + rule.weight;
    }
  }

  return weights;
}

function matchRule(rule: SegmentRule, fieldValue: string): boolean {
  const val = fieldValue.toLowerCase();
  const ruleVal = rule.value.toLowerCase();

  switch (rule.operator) {
    case 'contains':
      return val.includes(ruleVal);
    case 'equals':
      return val === ruleVal;
    default:
      return false;
  }
}

/**
 * Merge old weights with new weights using the configured weightMergeFactor.
 * Formula: mergedWeight = (oldWeight * weightMergeFactor) + newWeight
 */
export function mergeWeights(
  oldWeights: Record<string, number>,
  newWeights: Record<string, number>,
): Record<string, number> {
  const factor = cfg.weightMergeFactor;
  const merged: Record<string, number> = {};

  // Include all known segments
  for (const seg of VALID_SEGMENTS) {
    const oldW = oldWeights[seg] || 0;
    const newW = newWeights[seg] || 0;
    merged[seg] = (oldW * factor) + newW;
  }

  return merged;
}

/**
 * Find the best matching template rule for a given pageType, primarySegment, and lifecycleStage.
 * First match wins — rules are evaluated in config order.
 */
export function findTemplateRule(
  pageType: string,
  primarySegment: string,
  lifecycleStage: string,
): TemplateRule | null {
  for (const rule of cfg.templateRules) {
    if (rule.pageType !== pageType) continue;
    if (!rule.lifecycleStage.includes(lifecycleStage)) continue;
    if (rule.primarySegment && rule.primarySegment !== primarySegment) continue;
    return rule;
  }
  return null;
}

/** Get template content by key, falling back to default content. */
export function getTemplateContent(templateKey: string): TemplateContent {
  return cfg.templateContent[templateKey] || cfg.defaultContent;
}

/** Get the default template key from config. */
export function getDefaultTemplateKey(): string {
  return cfg.defaultTemplateKey;
}

/** Get the ruleset version from config. */
export function getRulesetVersion(): string {
  return cfg.rulesetVersion;
}

/** Get the timeout in ms from config. */
export function getTimeoutMs(): number {
  return cfg.timeoutMs;
}

/** Get the default content for fallback. */
export function getDefaultContent(): TemplateContent {
  return cfg.defaultContent;
}
