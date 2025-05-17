import requests
import time
import random

def send_test_metrics():
    """テスト用のメトリクスデータを送信"""
    base_url = "http://localhost:8000"
    
    # メモリ使用量のシミュレーション
    memory_usage = random.uniform(50, 90)  # 50-90%
    response = requests.post(
        f"{base_url}/api/metrics/update",
        json={"metric_type": "memory_usage", "value": memory_usage}
    )
    print(f"Memory usage update: {response.status_code}")
    
    # 処理時間のシミュレーション
    processing_time = random.uniform(100, 500)  # 100-500ms
    response = requests.post(
        f"{base_url}/api/metrics/update",
        json={"metric_type": "processing_time", "value": processing_time}
    )
    print(f"Processing time update: {response.status_code}")
    
    # エラー率のシミュレーション
    error_rate = random.uniform(0, 5)  # 0-5%
    response = requests.post(
        f"{base_url}/api/metrics/update",
        json={"metric_type": "error_rate", "value": error_rate}
    )
    print(f"Error rate update: {response.status_code}")

if __name__ == "__main__":
    try:
        while True:
            send_test_metrics()
            time.sleep(1)  # 1秒ごとに更新
    except KeyboardInterrupt:
        print("\nStopping test data generation") 