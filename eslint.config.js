import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

const noInlineStyle = {
  selector: "JSXAttribute[name.name='style']",
  message: 'Style through Tailwind classes and theme tokens, not inline styles.',
};

export default defineConfig(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      complexity: ['error', 10],
    },
  },
  {
    files: ['eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Scripts in the demo host repo are plain JavaScript, outside the TypeScript project.
    files: ['examples/**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: globals.node,
    },
  },
  {
    files: ['src/cli.ts', 'src/dev.ts', 'src/server/**', 'src/shared/**', '*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'error',
      'no-restricted-syntax': ['error', noInlineStyle],
    },
  },
  {
    files: ['src/ui/components/ui/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  prettier,
);
