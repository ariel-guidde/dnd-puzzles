import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Alias the workspace runtime straight to its TS source so Vite transpiles it inline
// (no build step needed for @puzzle/runtime during development).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@puzzle/runtime': fileURLToPath(new URL('../../packages/runtime/src/index.ts', import.meta.url)),
    },
  },
});
