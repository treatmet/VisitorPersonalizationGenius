/**
 * Database entity types for visitors and related tables.
 */

export interface Visitor {
  id: string;
  signupgenius_user_id: string | null;
  lifecycle_stage: LifecycleStage;
  primary_segment: Segment;
  sub_segment: string | null;
  confidence: number;
  first_seen_at: string;
  last_seen_at: string;
}

export interface VisitorSegmentWeight {
  visitor_id: string;
  segment: Segment;
  weight: number;
  last_seen_at: string;
}

export interface VisitorSignalLog {
  id: string;
  visitor_id: string;
  request_id: string;
  captured_at: string;
  page_path: string | null;
  page_type: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  user_agent: string | null;
  accept_language: string | null;
  ip: string | null;
  lifecycle_stage_hint: string | null;
  raw_payload_json: string;
}

export interface PersonalizationDecision {
  id: string;
  visitor_id: string;
  created_at: string;
  page_type: string;
  lifecycle_stage: string;
  primary_segment: string;
  sub_segment: string | null;
  confidence: number;
  template_key: string;
  ruleset_version: string;
  fallback_used: number; // SQLite boolean: 0 or 1
  response_json: string;
}

export type LifecycleStage = 'anonymous' | 'attendee' | 'creator' | 'paid_member';

export type Segment = 'school' | 'church' | 'nonprofit' | 'sports' | 'business' | 'unknown';

export const VALID_LIFECYCLE_STAGES: LifecycleStage[] = ['anonymous', 'attendee', 'creator', 'paid_member'];

export const VALID_SEGMENTS: Segment[] = ['school', 'church', 'nonprofit', 'sports', 'business', 'unknown'];
