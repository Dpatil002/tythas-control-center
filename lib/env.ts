import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://user:password@localhost:5432/tythas_control_center?sslmode=disable'),
  DIRECT_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters').default('tythas-control-center-dev-super-secret-key-min32chars'),
  AUTH_URL: z.string().url().default('http://localhost:3000'),
  MFA_ENCRYPTION_KEY: z.string().min(32, 'MFA_ENCRYPTION_KEY must be a 32-byte Base64 key').default('MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY='),
  RESEND_API_KEY: z.string().optional().default('re_dev_placeholder'),
  EMAIL_FROM: z.string().default('Tythas <noreply@example.com>'),
  UPSTASH_REDIS_REST_URL: z.string().optional().default(''),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(''),
  APP_ORIGIN: z.string().url().default('http://localhost:3000'),
  SEED_OWNER_EMAIL: z.string().email().default('owner@tythas.example'),
  SEED_OWNER_PASSWORD: z.string().default('ChangeMe123!'),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional().default(''),
  META_APP_ID: z.string().optional().default(''),
  META_APP_SECRET: z.string().optional().default(''),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('❌ Invalid environment variables:', result.error.format());
    }
    return envSchema.parse({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/tythas_control_center?sslmode=disable',
    });
  }
  return result.data;
};

export const env = parseEnv();
