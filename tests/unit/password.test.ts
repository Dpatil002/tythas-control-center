import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('Password Hashing & Verification (argon2id)', () => {
  it('should securely hash passwords and verify matching plaintext', async () => {
    const plain = 'SuperSecretP@ssw0rd123!';
    const hash = await hashPassword(plain);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(plain);
    expect(hash.startsWith('$argon2')).toBe(true);

    const isMatch = await verifyPassword(hash, plain);
    expect(isMatch).toBe(true);
  });

  it('should reject non-matching passwords', async () => {
    const plain = 'SuperSecretP@ssw0rd123!';
    const hash = await hashPassword(plain);

    const isMatch = await verifyPassword(hash, 'WrongPassword456!');
    expect(isMatch).toBe(false);
  });
});
