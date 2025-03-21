const nextPlugin = require('@next/eslint-plugin-next');
const js = require('@eslint/js');

module.exports = [
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