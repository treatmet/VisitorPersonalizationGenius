import { CaptureRequest, DecideRequest } from '../models/api';
import { VALID_LIFECYCLE_STAGES, LifecycleStage } from '../models/visitor';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateCaptureRequest(body: unknown): { data: CaptureRequest; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const b = body as Record<string, unknown>;

  if (!b || typeof b !== 'object') {
    errors.push({ field: 'body', message: 'Request body must be a JSON object' });
    return { data: {} as CaptureRequest, errors };
  }

  if (!b.requestId || typeof b.requestId !== 'string') {
    errors.push({ field: 'requestId', message: 'requestId is required and must be a string' });
  }

  const page = b.page as Record<string, unknown> | undefined;
  if (!page || typeof page !== 'object') {
    errors.push({ field: 'page', message: 'page is required and must be an object' });
  } else if (!page.pageType || typeof page.pageType !== 'string') {
    errors.push({ field: 'page.pageType', message: 'page.pageType is required and must be a string' });
  }

  // Validate lifecycleStageHint if present
  const context = b.context as Record<string, unknown> | undefined;
  if (context?.lifecycleStageHint) {
    if (!VALID_LIFECYCLE_STAGES.includes(context.lifecycleStageHint as LifecycleStage)) {
      errors.push({
        field: 'context.lifecycleStageHint',
        message: `lifecycleStageHint must be one of: ${VALID_LIFECYCLE_STAGES.join(', ')}`,
      });
    }
  }

  return { data: b as unknown as CaptureRequest, errors };
}

export function validateDecideRequest(body: unknown): { data: DecideRequest; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const b = body as Record<string, unknown>;

  if (!b || typeof b !== 'object') {
    errors.push({ field: 'body', message: 'Request body must be a JSON object' });
    return { data: {} as DecideRequest, errors };
  }

  if (!b.pageType || typeof b.pageType !== 'string') {
    errors.push({ field: 'pageType', message: 'pageType is required and must be a string' });
  }

  return { data: b as unknown as DecideRequest, errors };
}
