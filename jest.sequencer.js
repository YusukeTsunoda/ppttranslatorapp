// jest.sequencer.js
const Sequencer = require('@jest/test-sequencer').default;

/**
 * カスタムテストシーケンサー
 * テストの実行順序を最適化して安定性を向上させる
 */
class CustomSequencer extends Sequencer {
  /**
   * テストの実行順序をカスタマイズ
   * @param {Array} tests テスト一覧
   * @returns {Array} ソート済みテスト一覧
   */
  sort(tests) {
    // 基本的なソート（親クラスの実装）
    const sortedTests = super.sort(tests);

    // 優先度の高いテストを先に実行
    return sortedTests.sort((testA, testB) => {
      // 単体テスト（ユーティリティ、ヘルパー関数など）を先に実行
      if (testA.path.includes('/lib/') && !testB.path.includes('/lib/')) {
        return -1;
      }
      if (!testA.path.includes('/lib/') && testB.path.includes('/lib/')) {
        return 1;
      }

      // コンポーネントテストをAPIテストより先に実行
      if (testA.path.includes('/components/') && testB.path.includes('/api/')) {
        return -1;
      }
      if (testA.path.includes('/api/') && testB.path.includes('/components/')) {
        return 1;
      }

      // フックテストをページテストより先に実行
      if (testA.path.includes('/hooks/') && testB.path.includes('/app/')) {
        return -1;
      }
      if (testA.path.includes('/app/') && testB.path.includes('/hooks/')) {
        return 1;
      }

      // 認証関連のテストを先に実行
      if (testA.path.includes('/auth/') && !testB.path.includes('/auth/')) {
        return -1;
      }
      if (!testA.path.includes('/auth/') && testB.path.includes('/auth/')) {
        return 1;
      }

      // 過去に失敗したテストを先に実行（時間短縮のため）
      const testAFailed = testA.context?.config?.previousFailures?.[testA.path] || 0;
      const testBFailed = testB.context?.config?.previousFailures?.[testB.path] || 0;
      
      if (testAFailed !== testBFailed) {
        return testBFailed - testAFailed;
      }

      // 実行時間の長いテストを先に実行（並列実行の効率化）
      const testADuration = testA.context?.duration || 0;
      const testBDuration = testB.context?.duration || 0;
      
      if (testADuration !== testBDuration) {
        return testBDuration - testADuration;
      }

      // デフォルトはパス名でソート
      return testA.path.localeCompare(testB.path);
    });
  }
}

module.exports = CustomSequencer;
