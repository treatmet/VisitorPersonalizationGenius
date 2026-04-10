/**
 * Minimal logger for the POC.
 * In production, replace with a structured logging library (e.g. pino).
 */

export const logger = {
  info: (msg: string, data?: unknown) => {
    console.log(`[INFO] ${msg}`, data !== undefined ? data : '');
  },
  warn: (msg: string, data?: unknown) => {
    console.warn(`[WARN] ${msg}`, data !== undefined ? data : '');
  },
  error: (msg: string, data?: unknown) => {
    console.error(`[ERROR] ${msg}`, data !== undefined ? data : '');
  },
};
