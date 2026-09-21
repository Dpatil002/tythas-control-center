import { z } from 'zod';

export const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address for your teammate'),
  role: z.enum(['MANAGER']).default('MANAGER'),
});

export const acceptInviteSchema = z.object({
  password: z.string().min(12, 'Password must be at least 12 characters'),
  totpCode: z.string().min(6, '6-digit authenticator code is required'),
  encryptedMfaSecret: z.string().min(1, 'MFA secret must be provided'),
  hashedBackupCodes: z.array(z.string()).min(1, 'Backup codes are required'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'MANAGER']),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});
