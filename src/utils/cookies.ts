import { Request, Response } from 'express';
import { env } from '../config/env';

const COOKIE_NAME = env.cookieName;

/** Read the visitor ID from the sg_vid cookie. Returns null if not present. */
export function getVisitorIdFromCookie(req: Request): string | null {
  return req.cookies?.[COOKIE_NAME] || null;
}

/** Set the sg_vid cookie on the response. */
export function setVisitorCookie(res: Response, visitorId: string): void {
  res.cookie(COOKIE_NAME, visitorId, {
    httpOnly: true,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    sameSite: 'lax',
    path: '/',
  });
}
