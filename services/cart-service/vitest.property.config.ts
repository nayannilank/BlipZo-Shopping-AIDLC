import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.property.test.ts'],
    passWithNoTests: true,
  },
});
