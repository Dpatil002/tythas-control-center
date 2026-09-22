import { z } from 'zod';

const sanitizeUrl = (val: unknown) => {
  if (typeof val !== 'string' || !val) return 'http://localhost:3000';
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  return `https://${val}`;
};

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://user:password@localhost:5432/tythas_control_center?sslmode=disable'),
  DIRECT_URL: z.string().optional(),
  AUTH_SECRET: z.string().default('tythas-control-center-dev-super-secret-key-min32chars'),
  AUTH_URL: z.preprocess(sanitizeUrl, z.string().default('http://localhost:3000')),
  MFA_ENCRYPTION_KEY: z.string().default('MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY='),
  RESEND_API_KEY: z.string().optional().default('re_dev_placeholder'),
  EMAIL_FROM: z.string().default('Tythas <noreply@example.com>'),
  UPSTASH_REDIS_REST_URL: z.string().optional().default(''),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(''),
  APP_ORIGIN: z.preprocess(sanitizeUrl, z.string().default('http://localhost:3000')),
  SEED_OWNER_EMAIL: z.string().default('owner@tythas.example'),
  SEED_OWNER_PASSWORD: z.string().default('ChangeMe123!'),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional().default(''),
  META_APP_ID: z.string().optional().default(''),
  META_APP_SECRET: z.string().optional().default(''),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

const parseEnv = (): Env => {
  const result = envSchema.safeParse(process.env);
  if (result.success) {
    return result.data;
  }

  console.warn('⚠️ Some environment variables are using defaults or were invalid:', result.error.format());
  
  // Safe fallback without throwing
  return {
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/tythas_control_center?sslmode=disable',
    DIRECT_URL: process.env.DIRECT_URL,
    AUTH_SECRET: process.env.AUTH_SECRET || 'tythas-control-center-dev-super-secret-key-min32chars',
    AUTH_URL: sanitizeUrl(process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL),
    MFA_ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY || 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
    RESEND_API_KEY: process.env.RESEND_API_KEY || 're_dev_placeholder',
    EMAIL_FROM: process.env.EMAIL_FROM || 'Tythas <noreply@example.com>',
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    APP_ORIGIN: sanitizeUrl(process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL),
    SEED_OWNER_EMAIL: process.env.SEED_OWNER_EMAIL || 'owner@tythas.example',
    SEED_OWNER_PASSWORD: process.env.SEED_OWNER_PASSWORD || 'ChangeMe123!',
    GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    META_APP_ID: process.env.META_APP_ID || '',
    META_APP_SECRET: process.env.META_APP_SECRET || '',
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'test' | 'production') || 'development',
  };
};

export const env = parseEnv();
