"""
Monitoring application
"""
from fastapi import FastAPI, WebSocket, HTTPException, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional, Set
from pydantic import BaseModel
import json
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from .profiler import MemoryProfiler

# メトリクス更新用のリクエストモデル
class MetricUpdate(BaseModel):
    metric_type: str
    value: float

# パフォーマンスデータを保持する辞書
performance_data: Dict[str, List[Dict]] = {}

# アクティブなWebSocket接続を管理
active_connections: Set[WebSocket] = set()

# メモリプロファイラーのインスタンス
profiler = MemoryProfiler()

def initialize_metric(metric_type: str) -> None:
    """新しいメトリクスタイプを初期化"""
    if metric_type not in performance_data:
        performance_data[metric_type] = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    # 起動時の初期化
    initialize_metric("memory_usage")
    initialize_metric("processing_time")
    initialize_metric("error_rate")
    yield
    # シャットダウン時のクリーンアップ
    performance_data.clear()
    active_connections.clear()

app = FastAPI(lifespan=lifespan)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限する
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/metrics/current")
async def get_current_metrics():
    """現在のメトリクスを取得するエンドポイント"""
    return {
        metric_type: data[-1] if data else {"value": 0, "timestamp": datetime.now().isoformat()}
        for metric_type, data in performance_data.items()
    }

@app.get("/api/metrics/history/{metric_type}")
async def get_metric_history(metric_type: str, limit: Optional[int] = 100):
    """特定のメトリクスの履歴を取得するエンドポイント"""
    if metric_type not in performance_data:
        raise HTTPException(status_code=404, detail=f"Metric {metric_type} not found")
    return performance_data[metric_type][-limit:]

@app.get("/api/profiler/snapshot")
async def get_memory_snapshot():
    """現在のメモリ使用状況のスナップショットを取得"""
    return profiler.take_snapshot()

@app.get("/api/profiler/summary")
async def get_memory_summary():
    """メモリ使用状況のサマリーを取得"""
    return profiler.get_summary()

@app.get("/api/profiler/leaks")
async def get_memory_leaks():
    """メモリリークの可能性がある箇所を検出"""
    return profiler.detect_memory_leaks()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocketエンドポイント"""
    await websocket.accept()
    active_connections.add(websocket)
    try:
        while True:
            # クライアントからのメッセージを待機
            data = await websocket.receive_text()
            # 現在のメトリクスを送信
            current_metrics = {
                metric_type: data[-1] if data else {"value": 0, "timestamp": datetime.now().isoformat()}
                for metric_type, data in performance_data.items()
            }
            await websocket.send_text(json.dumps(current_metrics))
    except WebSocketDisconnect:
        active_connections.remove(websocket)

def update_metric(metric_type: str, value: float):
    """メトリクスを更新する内部関数"""
    if metric_type not in performance_data:
        performance_data[metric_type] = []
    
    data_point = {
        "value": value,
        "timestamp": datetime.now().isoformat()
    }
    performance_data[metric_type].append(data_point)

    # 最新のデータを接続中のクライアントに送信
    current_metrics = {
        metric_type: data[-1] if data else {"value": 0, "timestamp": datetime.now().isoformat()}
        for metric_type, data in performance_data.items()
    }
    asyncio.create_task(broadcast_metrics(current_metrics))

async def broadcast_metrics(metrics: Dict):
    """メトリクスを全クライアントにブロードキャスト"""
    for connection in active_connections:
        try:
            await connection.send_text(json.dumps(metrics))
        except:
            active_connections.remove(connection)

@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時のイベントハンドラ"""
    # メモリプロファイラーの初期化
    profiler.take_snapshot()

@app.on_event("shutdown")
async def shutdown_event():
    """アプリケーション終了時のイベントハンドラ"""
    # メモリプロファイラーのクリーンアップ
    profiler.cleanup()

@app.post("/api/metrics/update")
async def update_metrics(metric_data: MetricUpdate):
    """メトリクスを更新するエンドポイント"""
    update_metric(metric_data.metric_type, metric_data.value)
    return {"status": "success"} 