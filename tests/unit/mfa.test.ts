import { describe, it, expect } from 'vitest';
import { generateMfaSetup, verifyTotp, verifyAndConsumeBackupCode } from '@/lib/auth/mfa';
import * as OTPAuth from 'otpauth';
import { decrypt } from '@/lib/auth/crypto';

describe('MFA Setup & Verification (TOTP)', () => {
  it('should generate valid MFA setup with QR code, Base32 secret, and backup codes', async () => {
    const setup = await generateMfaSetup('test@tythas.example');

    expect(setup.secret).toBeDefined();
    expect(setup.encryptedSecret).toBeDefined();
    expect(setup.otpauthUri).toContain('otpauth://totp/');
    expect(setup.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(setup.backupCodes).toHaveLength(8);
    expect(setup.hashedBackupCodes).toHaveLength(8);
  });

  it('should verify correct TOTP code from current generator', async () => {
    const setup = await generateMfaSetup('test@tythas.example');
    const secret = decrypt(setup.encryptedSecret);

    const totp = new OTPAuth.TOTP({
      issuer: 'Tythas Control Center',
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const code = totp.generate();
    const isValid = verifyTotp(setup.encryptedSecret, code);
    expect(isValid).toBe(true);

    const isInvalid = verifyTotp(setup.encryptedSecret, '000000');
    expect(isInvalid).toBe(false);
  });

  it('should verify and consume single-use backup codes', async () => {
    const setup = await generateMfaSetup('test@tythas.example');
    const codeToUse = setup.backupCodes[0];

    const result1 = verifyAndConsumeBackupCode(setup.hashedBackupCodes, codeToUse);
    expect(result1.valid).toBe(true);
    expect(result1.remainingHashedCodes).toHaveLength(7);

    // Second attempt with already consumed code should fail
    const result2 = verifyAndConsumeBackupCode(result1.remainingHashedCodes, codeToUse);
    expect(result2.valid).toBe(false);
    expect(result2.remainingHashedCodes).toHaveLength(7);
  });
});
