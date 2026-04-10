import { getDb } from '../db/sqlite';
import { PersonalizationDecision } from '../models/entities';

export function insertDecision(decision: PersonalizationDecision): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO personalization_decisions
      (id, visitor_id, created_at, page_type, lifecycle_stage, primary_segment,
       sub_segment, confidence, template_key, ruleset_version, fallback_used, response_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    decision.id,
    decision.visitor_id,
    decision.created_at,
    decision.page_type,
    decision.lifecycle_stage,
    decision.primary_segment,
    decision.sub_segment,
    decision.confidence,
    decision.template_key,
    decision.ruleset_version,
    decision.fallback_used,
    decision.response_json,
  );
}
