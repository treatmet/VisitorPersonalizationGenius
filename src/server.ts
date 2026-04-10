import app from './app';
import { env } from './config/env';
import { runMigrations } from './db/migrations';
import { closeDb } from './db/sqlite';
import { logger } from './utils/logger';

// Initialize database
runMigrations();

// Start server
const server = app.listen(env.port, () => {
  logger.info(`Server running on http://localhost:${env.port}`);
  logger.info(`Environment: ${env.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  server.close();
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  server.close();
  closeDb();
  process.exit(0);
});
