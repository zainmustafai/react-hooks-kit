// eslint.config.js  — B0 from the master plan, plus the minimal wiring the
// plan omits: as written, the plan's config alone matches NO TypeScript
// files (flat config only lints extensions some block's `files` covers)
// and ESLint's default parser cannot parse TS syntax at all. The
// react-hooks block below is the plan's B0, verbatim.
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import tsParser from '@typescript-eslint/parser';

export default defineConfig([
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tsParser },
  },
  reactHooks.configs.flat.recommended,
]);
