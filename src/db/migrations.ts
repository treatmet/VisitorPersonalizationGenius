import { getDb } from './sqlite';
import { logger } from '../utils/logger';

/**
 * Run all schema migrations.
 * For the POC, we use CREATE TABLE IF NOT EXISTS.
 * In production, use a proper migration tool.
 */
export function runMigrations(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      id TEXT PRIMARY KEY,
      signupgenius_user_id TEXT,
      lifecycle_stage TEXT NOT NULL DEFAULT 'anonymous',
      primary_segment TEXT NOT NULL DEFAULT 'unknown',
      sub_segment TEXT,
      confidence REAL NOT NULL DEFAULT 0.0,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visitor_segment_weights (
      visitor_id TEXT NOT NULL,
      segment TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 0.0,
      last_seen_at TEXT NOT NULL,
      PRIMARY KEY (visitor_id, segment),
      FOREIGN KEY (visitor_id) REFERENCES visitors(id)
    );

    CREATE TABLE IF NOT EXISTS visitor_signal_logs (
      id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      request_id TEXT NOT NULL UNIQUE,
      captured_at TEXT NOT NULL,
      page_path TEXT,
      page_type TEXT,
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,
      gclid TEXT,
      user_agent TEXT,
      accept_language TEXT,
      ip TEXT,
      lifecycle_stage_hint TEXT,
      raw_payload_json TEXT NOT NULL,
      FOREIGN KEY (visitor_id) REFERENCES visitors(id)
    );

    CREATE TABLE IF NOT EXISTS personalization_decisions (
      id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      page_type TEXT NOT NULL,
      lifecycle_stage TEXT NOT NULL,
      primary_segment TEXT NOT NULL,
      sub_segment TEXT,
      confidence REAL NOT NULL DEFAULT 0.0,
      template_key TEXT NOT NULL,
      ruleset_version TEXT NOT NULL,
      fallback_used INTEGER NOT NULL DEFAULT 0,
      response_json TEXT NOT NULL,
      FOREIGN KEY (visitor_id) REFERENCES visitors(id)
    );
  `);

  logger.info('Database migrations complete');
}
