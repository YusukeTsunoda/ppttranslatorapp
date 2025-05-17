"""
メモリプロファイリングモジュール
"""
import psutil
import time
import tracemalloc
from typing import Dict, List, Optional
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MemoryProfiler:
    def __init__(self):
        self.process = psutil.Process()
        self.start_time = time.time()
        self.snapshots: List[Dict] = []
        tracemalloc.start()

    def take_snapshot(self) -> Dict:
        """
        現在のメモリ使用状況のスナップショットを取得
        """
        current_time = time.time()
        snapshot = tracemalloc.take_snapshot()
        memory_info = self.process.memory_info()

        stats = {
            'timestamp': datetime.now().isoformat(),
            'elapsed_time': current_time - self.start_time,
            'rss': memory_info.rss,  # Resident Set Size
            'vms': memory_info.vms,  # Virtual Memory Size
            'shared': getattr(memory_info, 'shared', 0),  # 共有メモリ
            'text': getattr(memory_info, 'text', 0),  # プログラムコード
            'data': getattr(memory_info, 'data', 0),  # データセグメント
        }

        # トップ10のメモリ使用箇所を取得
        top_stats = snapshot.statistics('lineno')
        stats['top_allocations'] = [
            {
                'file': str(stat.traceback[0].filename),
                'line': stat.traceback[0].lineno,
                'size': stat.size,
                'count': stat.count,
            }
            for stat in top_stats[:10]
        ]

        self.snapshots.append(stats)
        return stats

    def get_memory_growth(self, interval: Optional[float] = None) -> Dict:
        """
        メモリ使用量の増加率を計算
        """
        if len(self.snapshots) < 2:
            return {'growth_rate': 0, 'prediction': None}

        if interval is None:
            # 最新の2つのスナップショットを使用
            start = self.snapshots[-2]
            end = self.snapshots[-1]
        else:
            # 指定された間隔での変化を計算
            current_time = time.time()
            start_time = current_time - interval
            start = next(
                (s for s in reversed(self.snapshots)
                 if time.time() - s['elapsed_time'] >= start_time),
                self.snapshots[0]
            )
            end = self.snapshots[-1]

        time_diff = end['elapsed_time'] - start['elapsed_time']
        memory_diff = end['rss'] - start['rss']
        growth_rate = memory_diff / time_diff if time_diff > 0 else 0

        # 1時間後のメモリ使用量を予測
        prediction = end['rss'] + (growth_rate * 3600)

        return {
            'growth_rate': growth_rate,
            'prediction': prediction,
        }

    def detect_memory_leaks(self) -> List[Dict]:
        """
        メモリリークの可能性がある箇所を検出
        """
        if len(self.snapshots) < 2:
            return []

        latest = self.snapshots[-1]
        previous = self.snapshots[-2]

        leaks = []
        for curr in latest['top_allocations']:
            # 前回のスナップショットから同じファイル・行の情報を探す
            prev = next(
                (p for p in previous['top_allocations']
                 if p['file'] == curr['file'] and p['line'] == curr['line']),
                None
            )

            if prev:
                # メモリ使用量が増加している場合
                if curr['size'] > prev['size'] * 1.1:  # 10%以上の増加
                    leaks.append({
                        'file': curr['file'],
                        'line': curr['line'],
                        'size_increase': curr['size'] - prev['size'],
                        'count_increase': curr['count'] - prev['count'],
                        'current_size': curr['size'],
                    })

        return sorted(leaks, key=lambda x: x['size_increase'], reverse=True)

    def get_summary(self) -> Dict:
        """
        メモリ使用状況のサマリーを取得
        """
        if not self.snapshots:
            return {}

        latest = self.snapshots[-1]
        growth = self.get_memory_growth(interval=3600)  # 1時間の変化を計算
        leaks = self.detect_memory_leaks()

        return {
            'current_memory': {
                'rss': latest['rss'],
                'vms': latest['vms'],
                'shared': latest['shared'],
            },
            'memory_growth': growth,
            'potential_leaks': leaks[:5],  # 上位5件のリークを報告
            'runtime': latest['elapsed_time'],
            'snapshot_count': len(self.snapshots),
        }

    def cleanup(self):
        """
        プロファイラーのクリーンアップ
        """
        tracemalloc.stop()
        self.snapshots.clear()
        logger.info('Memory profiler cleaned up') 