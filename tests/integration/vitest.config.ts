import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./src/setup.ts'],
  },
  resolve: {
    alias: {
      '@aws-sdk/s3-request-presigner': new URL('./src/mocks/s3-presigner.ts', import.meta.url)
        .pathname,
      'aws-embedded-metrics': new URL('./src/mocks/aws-embedded-metrics.ts', import.meta.url)
        .pathname,
    },
  },
});
