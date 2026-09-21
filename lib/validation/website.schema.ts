import { z } from 'zod';

export const createWebsiteSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  name: z.string().min(1, 'Website name is required'),
  domain: z
    .string()
    .min(3, 'Domain is required')
    .transform((val) => val.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')),
  timezone: z.string().default('Asia/Kolkata'),
});

export const updateWebsiteSchema = z.object({
  name: z.string().min(1).optional(),
  timezone: z.string().optional(),
});

export const grantAccessSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});
