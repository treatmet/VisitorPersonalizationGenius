import Database from 'better-sqlite3';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(env.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    logger.info(`SQLite database opened at ${env.dbPath}`);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    logger.info('SQLite database closed');
  }
}
