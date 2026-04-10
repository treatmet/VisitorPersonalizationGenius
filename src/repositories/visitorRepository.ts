import { getDb } from '../db/sqlite';
import { Visitor, VisitorSegmentWeight, Segment } from '../models/visitor';

export function findVisitorById(id: string): Visitor | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM visitors WHERE id = ?').get(id) as Visitor | undefined;
}

export function insertVisitor(visitor: Visitor): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO visitors (id, signupgenius_user_id, lifecycle_stage, primary_segment, sub_segment, confidence, first_seen_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    visitor.id,
    visitor.signupgenius_user_id,
    visitor.lifecycle_stage,
    visitor.primary_segment,
    visitor.sub_segment,
    visitor.confidence,
    visitor.first_seen_at,
    visitor.last_seen_at,
  );
}

export function updateVisitor(
  id: string,
  fields: { lifecycle_stage: string; primary_segment: string; sub_segment: string | null; confidence: number; last_seen_at: string },
): void {
  const db = getDb();
  db.prepare(`
    UPDATE visitors SET lifecycle_stage = ?, primary_segment = ?, sub_segment = ?, confidence = ?, last_seen_at = ?
    WHERE id = ?
  `).run(fields.lifecycle_stage, fields.primary_segment, fields.sub_segment, fields.confidence, fields.last_seen_at, id);
}

export function getSegmentWeights(visitorId: string): VisitorSegmentWeight[] {
  const db = getDb();
  return db.prepare('SELECT * FROM visitor_segment_weights WHERE visitor_id = ?').all(visitorId) as VisitorSegmentWeight[];
}

export function upsertSegmentWeight(visitorId: string, segment: Segment, weight: number, lastSeenAt: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO visitor_segment_weights (visitor_id, segment, weight, last_seen_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(visitor_id, segment) DO UPDATE SET weight = ?, last_seen_at = ?
  `).run(visitorId, segment, weight, lastSeenAt, weight, lastSeenAt);
}
