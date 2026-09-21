import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { encrypt, decrypt } from './crypto';
import { hashToken } from './tokens';

export interface MfaSetupDetails {
  secret: string;
  encryptedSecret: string;
  otpauthUri: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
  hashedBackupCodes: string[];
}

export async function generateMfaSetup(email: string, issuer: string = 'Tythas Control Center'): Promise<MfaSetupDetails> {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  const secret = totp.secret.base32;
  const encryptedSecret = encrypt(secret);
  const otpauthUri = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 2, width: 220 });

  // Generate 8-10 backup codes (each 10 chars formatted e.g. xxxx-xxxx)
  const backupCodes: string[] = [];
  const hashedBackupCodes: string[] = [];

  for (let i = 0; i < 8; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    backupCodes.push(formatted);
    hashedBackupCodes.push(hashToken(formatted));
  }

  return {
    secret,
    encryptedSecret,
    otpauthUri,
    qrCodeDataUrl,
    backupCodes,
    hashedBackupCodes,
  };
}

export function verifyTotp(encryptedSecret: string, token: string): boolean {
  try {
    const secret = decrypt(encryptedSecret);
    const totp = new OTPAuth.TOTP({
      issuer: 'Tythas Control Center',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({
      token: token.trim().replace(/\s+/g, ''),
      window: 1, // allow +/- 30 seconds clock drift
    });

    return delta !== null;
  } catch {
    return false;
  }
}

export function verifyAndConsumeBackupCode(
  storedHashedCodes: string[],
  providedCode: string
): { valid: boolean; remainingHashedCodes: string[] } {
  const cleanCode = providedCode.trim().toUpperCase();
  const hashed = hashToken(cleanCode);
  const index = storedHashedCodes.indexOf(hashed);

  if (index !== -1) {
    const remaining = [...storedHashedCodes];
    remaining.splice(index, 1);
    return { valid: true, remainingHashedCodes: remaining };
  }

  return { valid: false, remainingHashedCodes: storedHashedCodes };
}
