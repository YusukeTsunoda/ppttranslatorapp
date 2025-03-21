module.exports = {
  extends: ['next', 'next/core-web-vitals'],
  plugins: ['@next/next'],
  rules: {
    '@next/next/no-html-link-for-pages': 'warn',
    'react/no-unescaped-entities': 'off',
  },
  ignorePatterns: ['node_modules/', '.next/', 'out/', 'public/'],
};
