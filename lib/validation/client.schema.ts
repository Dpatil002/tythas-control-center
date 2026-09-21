import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  primaryContactName: z.string().optional().nullable(),
  contactEmail: z.string().email('Invalid contact email').optional().nullable().or(z.literal('')),
  contactPhone: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).default('ACTIVE'),
  notes: z.string().optional().nullable(),
});

export const updateClientSchema = createClientSchema.partial();
