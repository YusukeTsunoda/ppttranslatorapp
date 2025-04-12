// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
    '@babel/preset-typescript',
    // Runtime を 'automatic' に戻す
    ['@babel/preset-react', { runtime: 'automatic' }] 
  ],
  plugins: [
    '@babel/plugin-transform-modules-commonjs', 
    [
      '@babel/plugin-transform-runtime',
      {
        regenerator: true,
      },
    ],
  ],
};
