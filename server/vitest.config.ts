import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/db/sequelize.ts'],
      reporter: ['text', 'html', 'json-summary'],
    },
  }
});
