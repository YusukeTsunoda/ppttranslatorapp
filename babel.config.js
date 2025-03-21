// Jestテスト環境でのみ使用されるBabel設定
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [],
  // NODE_ENV=testの場合のみBabelを適用
  env: {
    test: {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    },
  },
  // テスト環境以外ではBabelを無効化
  only: [
    './tests/**/*.{js,jsx,ts,tsx}',
    // その他、テスト用のファイル
  ],
  // next/jestで使用されるファイルは処理しない
  ignore: ['./.next', './node_modules', './out'],
};
