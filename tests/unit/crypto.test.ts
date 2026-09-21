import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '@/lib/auth/crypto';
import { generateRawToken, hashToken } from '@/lib/auth/tokens';

describe('Cryptographic Utilities', () => {
  it('should encrypt and decrypt secrets with AES-256-GCM', () => {
    const plain = 'JBSWY3DPEHPK3PXP';
    const encrypted = encrypt(plain);

    expect(encrypted).not.toBe(plain);
    expect(encrypted.split(':').length).toBe(3); // iv:tag:cipher

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plain);
  });

  it('should generate secure raw tokens and deterministic SHA-256 hashes', () => {
    const raw1 = generateRawToken(32);
    const raw2 = generateRawToken(32);

    expect(raw1).toHaveLength(64);
    expect(raw2).toHaveLength(64);
    expect(raw1).not.toBe(raw2);

    const hash1a = hashToken(raw1);
    const hash1b = hashToken(raw1);
    const hash2 = hashToken(raw2);

    expect(hash1a).toBe(hash1b);
    expect(hash1a).not.toBe(hash2);
  });
});
