// グラフ更新間隔（ミリ秒）
const UPDATE_INTERVAL = 30000;

// メトリクスデータの取得
async function fetchMetrics(metricName = null, lastN = 10) {
    const url = metricName 
        ? `/api/metrics?metric_name=${metricName}&last_n=${lastN}`
        : `/api/metrics?last_n=${lastN}`;
    
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('Error fetching metrics:', error);
        return null;
    }
}

// 異常値データの取得
async function fetchAnomalies(threshold = 2.0) {
    try {
        const response = await fetch(`/api/anomalies?threshold=${threshold}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching anomalies:', error);
        return null;
    }
}

// 処理時間トレンドグラフの更新
async function updateProcessingTimeChart() {
    const data = await fetchMetrics('processing_time', 20);
    if (!data || data.error) return;

    const trace = {
        x: Array.from({length: data.values?.length || 0}, (_, i) => i + 1),
        y: data.values || [],
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Processing Time',
        line: {
            color: 'rgb(75, 192, 192)',
            width: 2
        }
    };

    const layout = {
        title: 'Processing Time Trend',
        xaxis: {title: 'Measurement'},
        yaxis: {title: 'Time (ms)'}
    };

    Plotly.newPlot('processingTimeChart', [trace], layout);
}

// メモリ使用量トレンドグラフの更新
async function updateMemoryUsageChart() {
    const data = await fetchMetrics('memory_usage', 20);
    if (!data || data.error) return;

    const trace = {
        x: Array.from({length: data.values?.length || 0}, (_, i) => i + 1),
        y: data.values || [],
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Memory Usage',
        line: {
            color: 'rgb(153, 102, 255)',
            width: 2
        }
    };

    const layout = {
        title: 'Memory Usage Trend',
        xaxis: {title: 'Measurement'},
        yaxis: {title: 'Memory (MB)'}
    };

    Plotly.newPlot('memoryUsageChart', [trace], layout);
}

// 異常値検出グラフの更新
async function updateAnomalyChart() {
    const anomalies = await fetchAnomalies();
    if (!anomalies) return;

    const metrics = ['processing_time', 'memory_usage', 'error_count'];
    const datasets = [];

    for (const metric of metrics) {
        if (anomalies[metric] && !anomalies[metric].error) {
            datasets.push({
                label: metric,
                data: anomalies[metric],
                backgroundColor: getMetricColor(metric),
                borderColor: getMetricColor(metric),
                borderWidth: 1
            });
        }
    }

    const ctx = document.getElementById('anomalyChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: metrics,
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Anomaly Count'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Detected Anomalies by Metric'
                }
            }
        }
    });
}

// メトリクス別の色を取得
function getMetricColor(metric) {
    const colors = {
        'processing_time': 'rgb(75, 192, 192)',
        'memory_usage': 'rgb(153, 102, 255)',
        'error_count': 'rgb(255, 99, 132)'
    };
    return colors[metric] || 'rgb(201, 203, 207)';
}

// アラート設定の更新
function updateAlertSettings() {
    const thresholds = {
        'processing_time': 5000,  // 5秒
        'memory_usage': 1024,     // 1GB
        'error_count': 10         // 10エラー
    };

    // アラート設定をローカルストレージに保存
    localStorage.setItem('alertThresholds', JSON.stringify(thresholds));
}

// グラフの定期更新
function startPeriodicUpdates() {
    updateProcessingTimeChart();
    updateMemoryUsageChart();
    updateAnomalyChart();
    
    setInterval(() => {
        updateProcessingTimeChart();
        updateMemoryUsageChart();
        updateAnomalyChart();
    }, UPDATE_INTERVAL);
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    startPeriodicUpdates();
    updateAlertSettings();
}); 