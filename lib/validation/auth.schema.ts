import { z } from 'zod';

export const signupSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  code: z.string().optional(), // 6-digit TOTP code or backup code
});

export const mfaSetupSchema = z.object({
  userId: z.string().optional(),
});

export const mfaVerifySchema = z.object({
  code: z.string().min(6, 'Authentication code is required'),
  encryptedSecret: z.string().optional(),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});
