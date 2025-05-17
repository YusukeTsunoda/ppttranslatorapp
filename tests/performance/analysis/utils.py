import time
import psutil
import os
from typing import Dict, Callable, Any
from functools import wraps
import numpy as np
from pathlib import Path
import json

def measure_time(func: Callable) -> Callable:
    """関数の実行時間を計測するデコレータ"""
    @wraps(func)
    def wrapper(*args, **kwargs) -> tuple[Any, float]:
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        return result, (end_time - start_time) * 1000  # ミリ秒単位で返す
    return wrapper

def get_memory_usage() -> float:
    """現在のプロセスのメモリ使用量を取得（MB単位）"""
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024

def calculate_statistics(values: list[float]) -> Dict:
    """基本的な統計情報を計算"""
    if not values:
        return {
            "count": 0,
            "mean": 0,
            "std": 0,
            "min": 0,
            "max": 0,
            "median": 0
        }
    
    values_array = np.array(values)
    return {
        "count": len(values),
        "mean": float(np.mean(values_array)),
        "std": float(np.std(values_array)),
        "min": float(np.min(values_array)),
        "max": float(np.max(values_array)),
        "median": float(np.median(values_array))
    }

def detect_anomalies(values: list[float], threshold: float = 2.0) -> list[int]:
    """Z-scoreベースの異常値検出"""
    if len(values) < 2:
        return []
    
    values_array = np.array(values)
    z_scores = np.abs((values_array - np.mean(values_array)) / np.std(values_array))
    return [i for i, z in enumerate(z_scores) if z > threshold]

def save_performance_data(data: Dict, output_dir: Path, prefix: str = "perf"):
    """パフォーマンスデータをJSONファイルとして保存"""
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / f"{prefix}_{timestamp}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return output_file

def load_performance_data(file_path: Path) -> Dict:
    """パフォーマンスデータをJSONファイルから読み込み"""
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def analyze_trend(data_points: list[float]) -> Dict:
    """トレンド分析を実行"""
    if len(data_points) < 2:
        return {
            "trend": "insufficient_data",
            "slope": 0,
            "correlation": 0
        }
    
    x = np.arange(len(data_points))
    y = np.array(data_points)
    
    # 線形回帰
    slope, intercept = np.polyfit(x, y, 1)
    
    # 相関係数
    correlation = np.corrcoef(x, y)[0, 1]
    
    return {
        "trend": "increasing" if slope > 0 else "decreasing",
        "slope": float(slope),
        "correlation": float(correlation)
    }

def compare_performance(baseline: Dict, current: Dict, threshold: float = 0.1) -> Dict:
    """ベースラインと現在のパフォーマンスを比較"""
    comparison = {}
    for metric, value in current.items():
        if metric in baseline:
            baseline_value = baseline[metric]
            diff_percent = ((value - baseline_value) / baseline_value) * 100
            comparison[metric] = {
                "baseline": baseline_value,
                "current": value,
                "diff_percent": diff_percent,
                "status": (
                    "degraded" if diff_percent > threshold * 100
                    else "improved" if diff_percent < -threshold * 100
                    else "stable"
                )
            }
    return comparison

class PerformanceMonitor:
    """パフォーマンスモニタリングクラス"""
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.measurements = []
        self.start_time = None
    
    def start(self):
        """モニタリングを開始"""
        self.start_time = time.time()
        self.measurements = []
    
    def record(self, metric_name: str, value: float, metadata: Dict = None):
        """メトリクスを記録"""
        self.measurements.append({
            "metric_name": metric_name,
            "value": value,
            "timestamp": time.time(),
            "metadata": metadata or {}
        })
    
    def stop(self) -> Dict:
        """モニタリングを終了し結果を返す"""
        end_time = time.time()
        duration = end_time - self.start_time
        
        result = {
            "start_time": self.start_time,
            "end_time": end_time,
            "duration": duration,
            "measurements": self.measurements
        }
        
        # 結果を保存
        save_performance_data(result, self.output_dir)
        
        return result 