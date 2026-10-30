// vitest.config.ts — B10 from the master plan, plus the resolve.alias the
// plan omits: B9 imports via '@/hooks/...', which tsc resolves from
// tsconfig paths but Vitest/Vite cannot resolve without this alias.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: { environment: 'jsdom' },
});
