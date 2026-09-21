import crypto from 'crypto';
import { env } from '@/lib/env';
import { IntegrationProvider } from './types';

const STATE_SECRET = env.AUTH_SECRET || 'tythas-oauth-state-secret';
const STATE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface OAuthStatePayload {
  websiteId: string;
  provider: IntegrationProvider;
  userId: string;
  timestamp: number;
  nonce: string;
}

export function generateOAuthState(
  websiteId: string,
  provider: IntegrationProvider,
  userId: string
): string {
  const payload: OAuthStatePayload = {
    websiteId,
    provider,
    userId,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(8).toString('hex'),
  };

  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', STATE_SECRET)
    .update(serialized)
    .digest('base64url');

  return `${serialized}.${signature}`;
}

export function verifyOAuthState(
  stateString: string
): OAuthStatePayload | null {
  if (!stateString || typeof stateString !== 'string') return null;

  const parts = stateString.split('.');
  if (parts.length !== 2) return null;

  const [serialized, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', STATE_SECRET)
    .update(serialized)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const json = Buffer.from(serialized, 'base64url').toString('utf8');
    const payload: OAuthStatePayload = JSON.parse(json);

    // Check expiry
    if (Date.now() - payload.timestamp > STATE_TTL_MS) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
