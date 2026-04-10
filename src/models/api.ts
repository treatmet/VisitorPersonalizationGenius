/**
 * API request and response types.
 */

import { LifecycleStage, Segment } from './entities';

// ---- Capture endpoint ----

export interface CaptureRequest {
  requestId: string;
  page: {
    path?: string;
    pageType: string;
    referrer?: string;
    query?: {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_content?: string;
      utm_term?: string;
      gclid?: string;
    };
  };
  signupgeniusUserId?: string;
  signals?: Record<string, string>;
  context?: {
    lifecycleStageHint?: LifecycleStage;
  };
}

export interface CaptureResponse {
  visitorId: string;
  lifecycleStage: LifecycleStage;
  primarySegment: Segment;
  subSegment: string | null;
  segmentWeights: Record<string, number>;
}

// ---- Decide endpoint ----

export interface DecideRequest {
  pageType: string;
}

import { HeroContent, ThemeContent } from './rules';

export interface ExperiencePayload {
  templateKey: string;
  hero: HeroContent;
  theme: ThemeContent;
}

export interface DecideResponse {
  visitorId: string | null;
  lifecycleStage: LifecycleStage;
  primarySegment: Segment;
  subSegment: string | null;
  segmentWeights: Record<string, number>;
  experience: ExperiencePayload;
  metadata: {
    fallbackUsed: boolean;
    rulesetVersion: string;
  };
}

// ---- Bot response ----

export interface BotIgnoredResponse {
  ignored: true;
  reason: string;
}
