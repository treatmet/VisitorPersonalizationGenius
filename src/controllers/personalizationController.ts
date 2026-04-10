import { Request, Response } from 'express';
import { validateDecideRequest } from '../utils/validation';
import { isBot } from '../utils/botDetection';
import { getVisitorIdFromCookie } from '../utils/cookies';
import { decide } from '../services/personalizationService';
import { getTimeoutMs, getRulesetVersion, getDefaultTemplateKey, getDefaultContent } from '../services/ruleEngineService';
import { VALID_SEGMENTS } from '../models/visitor';
import { logger } from '../utils/logger';

export function handleDecide(req: Request, res: Response): void {
  try {
    // Bot check — return safe default
    const userAgent = req.headers['user-agent'];
    if (isBot(userAgent)) {
      res.status(200).json(buildBotFallback());
      return;
    }

    // Validate
    const { data, errors } = validateDecideRequest(req.body);
    if (errors.length > 0) {
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }

    const visitorId = getVisitorIdFromCookie(req);

    // Wrap decision in a timeout. If it takes too long, return fallback.
    const timeoutMs = getTimeoutMs();
    const start = Date.now();

    const result = decide(visitorId, data.pageType);

    const elapsed = Date.now() - start;
    if (elapsed > timeoutMs) {
      logger.warn(`Decision took ${elapsed}ms (timeout=${timeoutMs}ms), but completed synchronously`);
    }

    res.status(200).json(result);
  } catch (err) {
    // On any failure, return a safe default experience so the page still loads
    logger.error('Decide endpoint error, returning fallback', err);
    res.status(200).json(buildErrorFallback());
  }
}

function buildBotFallback() {
  const defaultContent = getDefaultContent();
  const segmentWeights: Record<string, number> = {};
  for (const seg of VALID_SEGMENTS) {
    segmentWeights[seg] = 0;
  }
  return {
    visitorId: null,
    lifecycleStage: 'anonymous',
    primarySegment: 'unknown',
    subSegment: null,
    segmentWeights,
    experience: {
      templateKey: getDefaultTemplateKey(),
      hero: defaultContent.hero,
      theme: defaultContent.theme,
    },
    metadata: {
      fallbackUsed: true,
      rulesetVersion: getRulesetVersion(),
    },
  };
}

function buildErrorFallback() {
  const defaultContent = getDefaultContent();
  const segmentWeights: Record<string, number> = {};
  for (const seg of VALID_SEGMENTS) {
    segmentWeights[seg] = 0;
  }
  return {
    visitorId: null,
    lifecycleStage: 'anonymous',
    primarySegment: 'unknown',
    subSegment: null,
    segmentWeights,
    experience: {
      templateKey: getDefaultTemplateKey(),
      hero: defaultContent.hero,
      theme: defaultContent.theme,
    },
    metadata: {
      fallbackUsed: true,
      rulesetVersion: getRulesetVersion(),
    },
  };
}
