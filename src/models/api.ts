/**
 * API request and response types.
 */

import { LifecycleStage, Segment } from './visitor';

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

export interface HeroContent {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaUrl: string;
}

export interface ThemeContent {
  variant: string;
}

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
