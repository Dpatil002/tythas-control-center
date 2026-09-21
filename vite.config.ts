import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_aVK0psAOu9FD@ep-mute-tooth-b41sw1ua-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    },
  },
});

