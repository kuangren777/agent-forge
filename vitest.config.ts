import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    // AYA worktrees live inside the project dir; never glob their test copies
    exclude: ['**/node_modules/**', '**/dist/**', '.aya-worktrees/**'],
  },
});
