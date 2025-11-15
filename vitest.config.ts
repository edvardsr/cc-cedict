import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'build.js',
        'data/**',
        '**/*.config.{js,ts}',
        '**/types/**',
        'tests/**',
      ],
    },
    include: ['tests/**/*.{test,spec}.{js,ts}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
