import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

const reactSettings = { react: { version: '18.3' } };
const reactPlugins = {
  react,
  'react-hooks': reactHooks,
  'react-refresh': reactRefresh,
};

export default defineConfig([
  // schema.d.ts is generated (npm run api:types).
  globalIgnores(['dist', 'coverage', 'src/shared/api/schema.d.ts']),

  // The app (TypeScript), with type-aware rules (e.g. no floating promises: an un-awaited
  // request would swallow its error).
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: reactSettings,
    plugins: reactPlugins,
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off', // the props are typed
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
]);
