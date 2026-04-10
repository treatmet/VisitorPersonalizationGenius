import { Request, Response } from 'express';
import { validateCaptureRequest } from '../utils/validation';
import { isBot } from '../utils/botDetection';
import { getVisitorIdFromCookie, setVisitorCookie } from '../utils/cookies';
import { captureVisitor } from '../services/visitorService';
import { BotIgnoredResponse } from '../models/api';
import { logger } from '../utils/logger';

export function handleCapture(req: Request, res: Response): void {
  try {
    // Bot check
    const userAgent = req.headers['user-agent'];
    if (isBot(userAgent)) {
      const response: BotIgnoredResponse = { ignored: true, reason: 'bot detected' };
      res.status(200).json(response);
      return;
    }

    // Validate
    const { data, errors } = validateCaptureRequest(req.body);
    if (errors.length > 0) {
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }

    // Resolve visitor ID from cookie
    const visitorId = getVisitorIdFromCookie(req);

    // Process capture
    const result = captureVisitor(visitorId, {
      requestId: data.requestId,
      page: data.page,
      context: data.context,
      userAgent: userAgent,
      acceptLanguage: req.headers['accept-language'],
      ip: req.ip,
    });

    // Set cookie
    setVisitorCookie(res, result.visitorId);

    res.status(200).json(result);
  } catch (err: unknown) {
    // Handle duplicate requestId constraint violation gracefully
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      logger.warn('Duplicate requestId detected via constraint', err.message);
      res.status(409).json({ error: 'Duplicate requestId' });
      return;
    }
    logger.error('Capture endpoint error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
