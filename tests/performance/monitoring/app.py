from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pathlib import Path
import json
from typing import Dict, List, Optional
import sys
import os

# 親ディレクトリをPYTHONPATHに追加
sys.path.append(str(Path(__file__).parent.parent))
from analysis.performance_analyzer import PerformanceAnalyzer

app = FastAPI(title="Performance Monitoring Dashboard")
analyzer = PerformanceAnalyzer()

# 静的ファイルのマウント
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/", response_class=HTMLResponse)
async def get_dashboard():
    """ダッシュボードのメインページを返す"""
    html_path = static_dir / "index.html"
    if not html_path.exists():
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Performance Monitoring Dashboard</title>
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .chart-container { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
            </style>
        </head>
        <body>
            <h1>Performance Monitoring Dashboard</h1>
            <div class="chart-container">
                <h2>Processing Time Trend</h2>
                <div id="processingTimeChart"></div>
            </div>
            <div class="chart-container">
                <h2>Memory Usage Trend</h2>
                <div id="memoryUsageChart"></div>
            </div>
            <div class="chart-container">
                <h2>Anomaly Detection</h2>
                <div id="anomalyChart"></div>
            </div>
            <script src="/static/dashboard.js"></script>
        </body>
        </html>
        """
    else:
        return html_path.read_text()

@app.get("/api/metrics")
async def get_metrics(metric_name: Optional[str] = None, last_n: int = 10):
    """メトリクスデータを取得"""
    if metric_name:
        return analyzer.analyze_trend(metric_name, last_n)
    else:
        # 全メトリクスのサマリーを返す
        metrics = {}
        for metric in ["processing_time", "memory_usage", "error_count"]:
            try:
                metrics[metric] = analyzer.analyze_trend(metric, last_n)
            except Exception as e:
                metrics[metric] = {"error": str(e)}
        return metrics

@app.get("/api/anomalies")
async def get_anomalies(threshold: float = 2.0):
    """異常値を検出して返す"""
    anomalies = {}
    for metric in ["processing_time", "memory_usage", "error_count"]:
        try:
            trend_data = analyzer.analyze_trend(metric)
            if "anomalies" in trend_data:
                anomalies[metric] = trend_data["anomalies"]
        except Exception as e:
            anomalies[metric] = {"error": str(e)}
    return anomalies

@app.post("/api/baseline")
async def set_baseline(metrics: Dict):
    """ベースラインメトリクスを設定"""
    analyzer.set_baseline(metrics)
    return {"status": "success", "message": "Baseline metrics updated"}

@app.get("/api/comparison")
async def get_baseline_comparison(current_metrics: Dict):
    """現在のメトリクスをベースラインと比較"""
    return analyzer.compare_with_baseline(current_metrics) 