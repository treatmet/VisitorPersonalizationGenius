/**
 * Simple bot detection based on User-Agent substring matching.
 * Not exhaustive — just enough to filter obvious crawler traffic.
 */

const BOT_PATTERNS = [
  'bot',
  'spider',
  'crawler',
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'facebookexternalhit',
];

export function isBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some((pattern) => ua.includes(pattern));
}
