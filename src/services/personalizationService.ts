import { DecideResponse, ExperiencePayload } from '../models/api';
import { LifecycleStage, Segment, VALID_SEGMENTS } from '../models/entities';
import * as visitorRepo from '../repositories/visitorRepository';
import * as decisionRepo from '../repositories/decisionRepository';
import {
  findTemplateRule,
  getTemplateContent,
  getDefaultTemplateKey,
  getRulesetVersion,
  getDefaultContent,
} from './ruleEngineService';
import { generateId } from '../utils/id';
import { logger } from '../utils/logger';

/**
 * Make a personalization decision for a visitor and page type.
 * If no visitor is found, returns a default fallback experience.
 */
export function decide(visitorId: string | null, pageType: string): DecideResponse {
  const now = new Date().toISOString();
  const rulesetVersion = getRulesetVersion();

  // No visitor — return default fallback
  if (!visitorId) {
    logger.info('No visitor cookie, returning fallback');
    return buildFallbackResponse(null, pageType, rulesetVersion);
  }

  const visitor = visitorRepo.findVisitorById(visitorId);
  if (!visitor) {
    logger.info(`Visitor ${visitorId} not found, returning fallback`);
    return buildFallbackResponse(visitorId, pageType, rulesetVersion);
  }

  const lifecycleStage = visitor.lifecycle_stage as LifecycleStage;
  const primarySegment = visitor.primary_segment as Segment;

  // Find matching template rule
  const rule = findTemplateRule(pageType, primarySegment, lifecycleStage);
  const templateKey = rule?.templateKey || getDefaultTemplateKey();
  const content = getTemplateContent(templateKey);
  const fallbackUsed = !rule;

  // Build segment weights map
  const weightRows = visitorRepo.getSegmentWeights(visitorId);
  const segmentWeights: Record<string, number> = {};
  for (const seg of VALID_SEGMENTS) {
    segmentWeights[seg] = 0;
  }
  for (const row of weightRows) {
    segmentWeights[row.segment] = Math.round(row.weight * 100) / 100;
  }

  const experience: ExperiencePayload = {
    templateKey,
    hero: content.hero,
    theme: content.theme,
  };

  const response: DecideResponse = {
    visitorId,
    lifecycleStage,
    primarySegment,
    subSegment: visitor.sub_segment,
    segmentWeights,
    experience,
    metadata: {
      fallbackUsed,
      rulesetVersion,
    },
  };

  // Audit trail: log the decision
  decisionRepo.insertDecision({
    id: generateId(),
    visitor_id: visitorId,
    created_at: now,
    page_type: pageType,
    lifecycle_stage: lifecycleStage,
    primary_segment: primarySegment,
    sub_segment: visitor.sub_segment,
    confidence: visitor.confidence,
    template_key: templateKey,
    ruleset_version: rulesetVersion,
    fallback_used: fallbackUsed ? 1 : 0,
    response_json: JSON.stringify(response),
  });

  logger.info(`Decision for ${visitorId}: template=${templateKey}, fallback=${fallbackUsed}`);

  return response;
}

function buildFallbackResponse(visitorId: string | null, pageType: string, rulesetVersion: string): DecideResponse {
  const defaultKey = getDefaultTemplateKey();
  const defaultContent = getDefaultContent();
  const segmentWeights: Record<string, number> = {};
  for (const seg of VALID_SEGMENTS) {
    segmentWeights[seg] = 0;
  }

  return {
    visitorId,
    lifecycleStage: 'anonymous',
    primarySegment: 'unknown',
    subSegment: null,
    segmentWeights,
    experience: {
      templateKey: defaultKey,
      hero: defaultContent.hero,
      theme: defaultContent.theme,
    },
    metadata: {
      fallbackUsed: true,
      rulesetVersion,
    },
  };
}
