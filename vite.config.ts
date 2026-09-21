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
      DATABASE_URL: process.env.DATABASE_URL || '',
    },
  },
});

