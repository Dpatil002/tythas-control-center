import crypto from 'crypto';
import { env } from '@/lib/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  try {
    const buf = Buffer.from(env.MFA_ENCRYPTION_KEY, 'base64');
    if (buf.length === 32) return buf;
  } catch {
    // fallback
  }
  return crypto.createHash('sha256').update(env.MFA_ENCRYPTION_KEY).digest();
}

export function encryptIntegrationToken(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decryptIntegrationToken(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivBase64, authTagBase64, cipherBase64] = parts;
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const cipherText = Buffer.from(cipherBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);

  return decrypted.toString('utf8');
}
