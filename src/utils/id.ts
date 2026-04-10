import crypto from 'crypto';

/** Generate a prefixed unique ID for visitors. */
export function generateVisitorId(): string {
  return `vis_${crypto.randomUUID()}`;
}

/** Generate a unique ID for signal logs and decisions. */
export function generateId(): string {
  return crypto.randomUUID();
}
