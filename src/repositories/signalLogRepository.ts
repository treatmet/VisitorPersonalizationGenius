import { getDb } from '../db/sqlite';
import { VisitorSignalLog } from '../models/entities';

export function insertSignalLog(log: VisitorSignalLog): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO visitor_signal_logs
      (id, visitor_id, request_id, captured_at, page_path, page_type, referrer,
       utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid,
       user_agent, accept_language, ip, lifecycle_stage_hint, raw_payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    log.id,
    log.visitor_id,
    log.request_id,
    log.captured_at,
    log.page_path,
    log.page_type,
    log.referrer,
    log.utm_source,
    log.utm_medium,
    log.utm_campaign,
    log.utm_content,
    log.utm_term,
    log.gclid,
    log.user_agent,
    log.accept_language,
    log.ip,
    log.lifecycle_stage_hint,
    log.raw_payload_json,
  );
}

/** Returns true if a signal log with this requestId already exists. */
export function signalLogExistsByRequestId(requestId: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT 1 FROM visitor_signal_logs WHERE request_id = ?').get(requestId);
  return !!row;
}
