import json
import time
from datetime import datetime
from typing import Dict, List, Optional
import numpy as np
from pathlib import Path

class PerformanceAnalyzer:
    def __init__(self, data_dir: str = "tests/performance/data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.current_session: Dict = {}
        self.baseline_metrics: Optional[Dict] = None

    def start_measurement(self, test_name: str, metadata: Dict = None):
        """測定セッションを開始"""
        self.current_session = {
            "test_name": test_name,
            "start_time": time.time(),
            "metadata": metadata or {},
            "measurements": []
        }

    def record_metric(self, metric_name: str, value: float, metadata: Dict = None):
        """メトリクスを記録"""
        self.current_session["measurements"].append({
            "metric_name": metric_name,
            "value": value,
            "timestamp": time.time(),
            "metadata": metadata or {}
        })

    def end_measurement(self) -> Dict:
        """測定セッションを終了し結果を保存"""
        self.current_session["end_time"] = time.time()
        self.current_session["duration"] = (
            self.current_session["end_time"] - self.current_session["start_time"]
        )

        # 結果をファイルに保存
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = self.data_dir / f"perf_{timestamp}.json"
        with open(result_file, "w", encoding="utf-8") as f:
            json.dump(self.current_session, f, indent=2)

        return self.current_session

    def analyze_trend(self, metric_name: str, last_n: int = 10) -> Dict:
        """指定されたメトリクスのトレンドを分析"""
        files = sorted(self.data_dir.glob("perf_*.json"), reverse=True)[:last_n]
        values = []
        timestamps = []

        for file in files:
            with open(file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for measurement in data["measurements"]:
                    if measurement["metric_name"] == metric_name:
                        values.append(measurement["value"])
                        timestamps.append(measurement["timestamp"])

        if not values:
            return {"error": f"No data found for metric: {metric_name}"}

        values = np.array(values)
        return {
            "mean": float(np.mean(values)),
            "std": float(np.std(values)),
            "min": float(np.min(values)),
            "max": float(np.max(values)),
            "trend": "increasing" if np.polyfit(range(len(values)), values, 1)[0] > 0 else "decreasing",
            "anomalies": self._detect_anomalies(values)
        }

    def _detect_anomalies(self, values: np.ndarray, threshold: float = 2.0) -> List[int]:
        """異常値を検出（Z-scoreベース）"""
        z_scores = np.abs((values - np.mean(values)) / np.std(values))
        return [i for i, z in enumerate(z_scores) if z > threshold]

    def set_baseline(self, metrics: Dict):
        """ベースラインメトリクスを設定"""
        self.baseline_metrics = metrics

    def compare_with_baseline(self, current_metrics: Dict) -> Dict:
        """現在のメトリクスをベースラインと比較"""
        if not self.baseline_metrics:
            return {"error": "No baseline metrics set"}

        comparison = {}
        for metric, value in current_metrics.items():
            if metric in self.baseline_metrics:
                baseline = self.baseline_metrics[metric]
                diff_percent = ((value - baseline) / baseline) * 100
                comparison[metric] = {
                    "current": value,
                    "baseline": baseline,
                    "diff_percent": diff_percent,
                    "status": "degraded" if diff_percent > 10 else "improved" if diff_percent < -10 else "stable"
                }

        return comparison 