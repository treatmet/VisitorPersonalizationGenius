/**
 * Rule configuration types for the rule engine.
 */

export interface SegmentRule {
  field: string;        // e.g. 'utm_campaign', 'path', 'referrer', 'utm_source'
  operator: 'contains' | 'equals';
  value: string;
  segment: string;
  weight: number;
}

export interface TemplateRule {
  pageType: string;
  lifecycleStage: string[];   // array — first match wins
  primarySegment?: string;    // optional — if omitted, matches any segment
  templateKey: string;
}

export interface HeroContent {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaUrl: string;
}

export interface ThemeContent {
  variant: string;
}

export interface TemplateContent {
  hero: HeroContent;
  theme: ThemeContent;
}

export interface PersonalizationConfig {
  rulesetVersion: string;
  weightMergeFactor: number;
  timeoutMs: number;
  segmentRules: SegmentRule[];
  templateRules: TemplateRule[];
  templateContent: Record<string, TemplateContent>;
  defaultTemplateKey: string;
  defaultContent: TemplateContent;
}
