import nextPlugin from '@next/eslint-plugin-next';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    plugins: {
      next: nextPlugin,
    },
    rules: {
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    ignores: ['node_modules/**', '.next/**', 'out/**', 'public/**'],
  },
]; 