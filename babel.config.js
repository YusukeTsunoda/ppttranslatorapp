// babel.config.js
module.exports = {
  presets: [
    [
      'next/babel',
      {
        'preset-env': {},
        'transform-runtime': {},
        'styled-jsx': {},
        'class-properties': {},
      },
    ],
  ],
  plugins: [
    [
      '@babel/plugin-transform-runtime',
      {
        regenerator: true,
      },
    ],
  ],
  env: {
    test: {
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    },
  },
};
