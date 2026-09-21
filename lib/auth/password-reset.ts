import crypto from 'crypto';
import { env } from '@/lib/env';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function createPasswordResetToken(userId: string, currentPasswordHash: string): string {
  const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;
  const payload = `${userId}:${expiresAt}`;
  const key = `${env.AUTH_SECRET}:${currentPasswordHash}`;
  const signature = crypto.createHmac('sha256', key).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');
  return token;
}

export function verifyPasswordResetToken(
  token: string,
  currentPasswordHash: string
): { valid: boolean; userId?: string } {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const [userId, expiresAtStr, signature] = raw.split(':');

    if (!userId || !expiresAtStr || !signature) {
      return { valid: false };
    }

    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() > expiresAt) {
      return { valid: false };
    }

    const payload = `${userId}:${expiresAtStr}`;
    const key = `${env.AUTH_SECRET}:${currentPasswordHash}`;
    const expectedSignature = crypto.createHmac('sha256', key).update(payload).digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: true, userId };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}
