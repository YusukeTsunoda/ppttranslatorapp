"""
Tests for monitoring functionality
"""
import pytest
import asyncio
from python_backend.monitoring.app import app, update_metric, get_current_metrics, get_metric_history, performance_data, active_connections
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
from datetime import datetime, timedelta
import json

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_test_data():
    """各テストの前にテストデータをクリア"""
    performance_data.clear()
    active_connections.clear()
    yield
    performance_data.clear()
    active_connections.clear()

def test_update_and_get_metrics():
    """メトリクス更新と取得のテスト"""
    # メトリクスの更新
    test_value = 100.0
    update_metric("test_metric", test_value)
    
    # 現在のメトリクスを取得
    response = client.get("/api/metrics/current")
    assert response.status_code == 200
    data = response.json()
    
    # test_metricが存在し、値が正しいことを確認
    assert "test_metric" in data
    assert data["test_metric"]["value"] == test_value
    
    # タイムスタンプが適切な形式であることを確認
    timestamp = datetime.fromisoformat(data["test_metric"]["timestamp"].replace('Z', '+00:00'))
    assert timestamp <= datetime.now()
    assert timestamp >= datetime.now() - timedelta(seconds=5)

def test_metric_history():
    """メトリクス履歴のテスト"""
    # 複数のメトリクスを追加
    values = [10.0, 20.0, 30.0]
    for value in values:
        update_metric("test_metric", value)
    
    # 履歴を取得
    response = client.get("/api/metrics/history/test_metric")
    assert response.status_code == 200
    data = response.json()
    
    # データが配列として返されることを確認
    assert isinstance(data["data"], list)
    # 少なくとも追加した値の数だけデータがあることを確認
    assert len(data["data"]) >= len(values)
    # 最新の値が最後の更新値と一致することを確認
    assert data["data"][-1]["value"] == values[-1]

def test_invalid_metric_type():
    """無効なメトリクスタイプのテスト"""
    response = client.get("/api/metrics/history/invalid_metric")
    assert response.status_code == 200  # エラーメッセージを返す
    data = response.json()
    assert "error" in data
    assert data["error"] == "Invalid metric type"

def test_websocket_connection():
    """WebSocket接続のテスト"""
    with client.websocket_connect("/ws") as websocket:
        # 初期データを受信
        initial_data = websocket.receive_json()
        assert isinstance(initial_data, dict)
        
        # メトリクスを更新
        test_value = 50.0
        update_metric("test_metric", test_value)
        
        # クライアントからのメッセージを送信（更新をトリガー）
        websocket.send_json({"type": "update"})
        
        # 更新後のデータを受信
        data = websocket.receive_json()
        assert isinstance(data, dict)
        assert "test_metric" in data
        assert data["test_metric"]["value"] == test_value

def test_websocket_reconnection():
    """WebSocket再接続のテスト"""
    # 最初の接続
    with client.websocket_connect("/ws") as websocket1:
        data1 = websocket1.receive_json()
        assert isinstance(data1, dict)
        websocket1.send_json({"type": "close"})
    
    # 再接続
    with client.websocket_connect("/ws") as websocket2:
        data2 = websocket2.receive_json()
        assert isinstance(data2, dict)
        websocket2.send_json({"type": "close"})

def test_websocket_error_handling():
    """WebSocketエラーハンドリングのテスト"""
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws") as websocket:
            # 初期データを受信
            initial_data = websocket.receive_json()
            
            # 強制的に接続を切断
            websocket.send_json({"type": "close"})
            
            # 切断後のデータ受信を試みる（例外が発生するはず）
            websocket.receive_json() 