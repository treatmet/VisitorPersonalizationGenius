import { CaptureRequest, CaptureResponse } from '../models/api';
import { LifecycleStage, Segment, VALID_SEGMENTS } from '../models/visitor';
import * as visitorRepo from '../repositories/visitorRepository';
import * as signalLogRepo from '../repositories/signalLogRepository';
import { generateVisitorId, generateId } from '../utils/id';
import { evaluateSegmentRules, mergeWeights } from './ruleEngineService';
import { logger } from '../utils/logger';

export interface CaptureInput {
  requestId: string;
  page: CaptureRequest['page'];
  context?: CaptureRequest['context'];
  userAgent?: string;
  acceptLanguage?: string;
  ip?: string;
}

/**
 * Process a visitor capture event:
 * 1. Create or find visitor
 * 2. Log the raw signal
 * 3. Evaluate segment rules and merge weights
 * 4. Update visitor state
 * 5. Return derived state
 */
export function captureVisitor(visitorId: string | null, input: CaptureInput): CaptureResponse {
  const now = new Date().toISOString();

  // Idempotency: if we've already processed this requestId, look up visitor and return current state
  if (signalLogRepo.signalLogExistsByRequestId(input.requestId)) {
    logger.info(`Duplicate requestId ${input.requestId}, returning existing state`);
    if (visitorId) {
      const existing = visitorRepo.findVisitorById(visitorId);
      if (existing) {
        const weights = visitorRepo.getSegmentWeights(visitorId);
        return buildCaptureResponse(existing.id, existing.lifecycle_stage as LifecycleStage, existing.primary_segment as Segment, existing.sub_segment, weights);
      }
    }
    // Edge case: duplicate request but no visitor cookie — return a minimal response
    // This shouldn't normally happen, but handle gracefully
    return buildCaptureResponse('unknown', 'anonymous', 'unknown', null, []);
  }

  // Resolve or create visitor
  let isNew = false;
  if (!visitorId) {
    visitorId = generateVisitorId();
    isNew = true;
  }

  let visitor = visitorRepo.findVisitorById(visitorId);
  if (!visitor) {
    isNew = true;
    visitorRepo.insertVisitor({
      id: visitorId,
      signupgenius_user_id: null,
      lifecycle_stage: 'anonymous',
      primary_segment: 'unknown',
      sub_segment: null,
      confidence: 0,
      first_seen_at: now,
      last_seen_at: now,
    });
    visitor = visitorRepo.findVisitorById(visitorId)!;
  }

  // Log the raw signal
  const signalLog = {
    id: generateId(),
    visitor_id: visitorId,
    request_id: input.requestId,
    captured_at: now,
    page_path: input.page.path || null,
    page_type: input.page.pageType || null,
    referrer: input.page.referrer || null,
    utm_source: input.page.query?.utm_source || null,
    utm_medium: input.page.query?.utm_medium || null,
    utm_campaign: input.page.query?.utm_campaign || null,
    utm_content: input.page.query?.utm_content || null,
    utm_term: input.page.query?.utm_term || null,
    gclid: input.page.query?.gclid || null,
    user_agent: input.userAgent || null,
    accept_language: input.acceptLanguage || null,
    ip: input.ip || null,
    lifecycle_stage_hint: input.context?.lifecycleStageHint || null,
    raw_payload_json: JSON.stringify(input),
  };
  signalLogRepo.insertSignalLog(signalLog);

  // Evaluate segment rules for this signal
  const signalFields: Record<string, string> = {};
  if (input.page.path) signalFields.path = input.page.path;
  if (input.page.referrer) signalFields.referrer = input.page.referrer;
  if (input.page.query?.utm_source) signalFields.utm_source = input.page.query.utm_source;
  if (input.page.query?.utm_medium) signalFields.utm_medium = input.page.query.utm_medium;
  if (input.page.query?.utm_campaign) signalFields.utm_campaign = input.page.query.utm_campaign;
  if (input.page.query?.utm_content) signalFields.utm_content = input.page.query.utm_content;
  if (input.page.query?.utm_term) signalFields.utm_term = input.page.query.utm_term;

  const newWeights = evaluateSegmentRules(signalFields);

  // Get existing weights and merge
  const existingWeightRows = visitorRepo.getSegmentWeights(visitorId);
  const existingWeights: Record<string, number> = {};
  for (const row of existingWeightRows) {
    existingWeights[row.segment] = row.weight;
  }

  const merged = mergeWeights(existingWeights, newWeights);

  // Persist merged weights
  for (const seg of VALID_SEGMENTS) {
    const w = merged[seg] || 0;
    visitorRepo.upsertSegmentWeight(visitorId, seg, w, now);
  }

  // Derive primary segment (highest weight, skip 'unknown')
  let primarySegment: Segment = visitor.primary_segment as Segment;
  let maxWeight = 0;
  for (const seg of VALID_SEGMENTS) {
    if (seg === 'unknown') continue;
    if ((merged[seg] || 0) > maxWeight) {
      maxWeight = merged[seg] || 0;
      primarySegment = seg;
    }
  }
  if (maxWeight === 0) primarySegment = 'unknown';

  // Determine confidence as normalized max weight (simple heuristic)
  const totalWeight = Object.values(merged).reduce((sum, w) => sum + w, 0);
  const confidence = totalWeight > 0 ? maxWeight / totalWeight : 0;

  // Determine lifecycle stage
  let lifecycleStage = visitor.lifecycle_stage as LifecycleStage;
  if (input.context?.lifecycleStageHint) {
    lifecycleStage = input.context.lifecycleStageHint;
  }

  // Update visitor record
  visitorRepo.updateVisitor(visitorId, {
    lifecycle_stage: lifecycleStage,
    primary_segment: primarySegment,
    sub_segment: null,
    confidence,
    last_seen_at: now,
  });

  logger.info(`Visitor ${visitorId} captured: segment=${primarySegment}, lifecycle=${lifecycleStage}, isNew=${isNew}`);

  // Build full weight map for response
  const weightMap = buildWeightMap(merged);

  return {
    visitorId,
    lifecycleStage,
    primarySegment,
    subSegment: null,
    segmentWeights: weightMap,
  };
}

function buildCaptureResponse(
  visitorId: string,
  lifecycleStage: LifecycleStage,
  primarySegment: Segment,
  subSegment: string | null,
  weightRows: Array<{ segment: string; weight: number }>,
): CaptureResponse {
  const segmentWeights: Record<string, number> = {};
  for (const seg of VALID_SEGMENTS) {
    segmentWeights[seg] = 0;
  }
  for (const row of weightRows) {
    segmentWeights[row.segment] = row.weight;
  }
  return { visitorId, lifecycleStage, primarySegment, subSegment, segmentWeights };
}

function buildWeightMap(merged: Record<string, number>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const seg of VALID_SEGMENTS) {
    map[seg] = Math.round((merged[seg] || 0) * 100) / 100;
  }
  return map;
}
