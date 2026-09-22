import crypto from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  try {
    if (!hash || !plainText) return false;

    // 1. Scrypt format (standard Node.js built-in)
    if (hash.startsWith('scrypt:')) {
      const parts = hash.split(':');
      if (parts.length !== 3) return false;
      const [, salt, key] = parts;
      return new Promise((resolve) => {
        crypto.scrypt(plainText, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
          if (err) resolve(false);
          else {
            try {
              const keyBuffer = Buffer.from(key, 'hex');
              resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
            } catch {
              resolve(false);
            }
          }
        });
      });
    }

    // 2. Argon2 format (backwards compatibility for previously seeded hashes)
    if (hash.startsWith('$argon2')) {
      try {
        const argon2 = await import('argon2');
        return await argon2.verify(hash, plainText);
      } catch (err) {
        console.warn('Argon2 dynamic verification unavailable in runtime:', err);
        return false;
      }
    }

    return false;
  } catch {
    return false;
  }
}
