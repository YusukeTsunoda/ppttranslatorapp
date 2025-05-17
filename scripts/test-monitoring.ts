import { MetricsCollector } from '../lib/monitoring/metrics';
import { AlertManager } from '../lib/monitoring/alerts';

async function testMonitoring() {
  console.log('モニタリングシステムのテストを開始します...\n');

  // メトリクス収集のテスト
  const metricsCollector = MetricsCollector.getInstance();
  const alertManager = AlertManager.getInstance();

  // メトリクス収集のテスト
  console.log('1. メトリクス収集のテスト');
  try {
    const metrics = await metricsCollector.collectSystemMetrics();
    console.log('収集されたメトリクス:', JSON.stringify(metrics, null, 2));
    console.log('✅ メトリクス収集テスト成功\n');
  } catch (error) {
    console.error('❌ メトリクス収集テスト失敗:', error);
    process.exit(1);
  }

  // アラートのテスト
  console.log('2. アラートシステムのテスト');
  try {
    // CPU高負荷のシミュレーション
    const highCPUMetrics = {
      cpuUsage: 95,
      memoryUsage: 50,
      diskUsage: 60,
      networkTraffic: {
        bytesIn: 1000,
        bytesOut: 2000
      }
    };

    await alertManager.checkMetrics(highCPUMetrics);
    console.log('✅ CPU高負荷アラートテスト成功');

    // メモリ高負荷のシミュレーション
    const highMemoryMetrics = {
      cpuUsage: 50,
      memoryUsage: 90,
      diskUsage: 60,
      networkTraffic: {
        bytesIn: 1000,
        bytesOut: 2000
      }
    };

    await alertManager.checkMetrics(highMemoryMetrics);
    console.log('✅ メモリ高負荷アラートテスト成功');

    // ディスク高使用率のシミュレーション
    const highDiskMetrics = {
      cpuUsage: 50,
      memoryUsage: 50,
      diskUsage: 95,
      networkTraffic: {
        bytesIn: 1000,
        bytesOut: 2000
      }
    };

    await alertManager.checkMetrics(highDiskMetrics);
    console.log('✅ ディスク高使用率アラートテスト成功\n');
  } catch (error) {
    console.error('❌ アラートシステムテスト失敗:', error);
    process.exit(1);
  }

  // リアルタイムモニタリングのテスト
  console.log('3. リアルタイムモニタリングのテスト（30秒間）');
  try {
    let testDuration = 30000; // 30秒
    const startTime = Date.now();

    metricsCollector.addListener((metrics) => {
      const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      console.log(`[${elapsedTime}秒経過] 現在のメトリクス:`, JSON.stringify(metrics, null, 2));
    });

    await new Promise(resolve => setTimeout(resolve, testDuration));
    console.log('✅ リアルタイムモニタリングテスト成功\n');
  } catch (error) {
    console.error('❌ リアルタイムモニタリングテスト失敗:', error);
    process.exit(1);
  }

  console.log('すべてのモニタリングテストが完了しました。');
}

// テストの実行
testMonitoring().catch(console.error); 