"""
キャッシュ管理モジュール
"""
from typing import Any, Dict, Optional
from collections import OrderedDict
import time
import threading
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LRUCache:
    """
    Least Recently Used (LRU) キャッシュの実装
    """
    def __init__(self, capacity: int, ttl: Optional[int] = None):
        """
        Args:
            capacity (int): キャッシュの最大容量
            ttl (Optional[int]): キャッシュエントリの有効期限（秒）
        """
        self.capacity = capacity
        self.ttl = ttl
        self.cache: OrderedDict = OrderedDict()
        self.timestamps: Dict[str, float] = {}
        self.lock = threading.Lock()
        self.stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'expirations': 0,
        }

    def get(self, key: str) -> Optional[Any]:
        """
        キャッシュからデータを取得

        Args:
            key (str): キャッシュキー

        Returns:
            Optional[Any]: キャッシュされた値、存在しない場合はNone
        """
        with self.lock:
            if key not in self.cache:
                self.stats['misses'] += 1
                return None

            # TTLチェック
            if self.ttl is not None:
                if time.time() - self.timestamps[key] > self.ttl:
                    self.remove(key)
                    self.stats['expirations'] += 1
                    return None

            # キャッシュヒット時の処理
            self.cache.move_to_end(key)
            self.stats['hits'] += 1
            return self.cache[key]

    def put(self, key: str, value: Any) -> None:
        """
        キャッシュにデータを格納

        Args:
            key (str): キャッシュキー
            value (Any): 格納する値
        """
        with self.lock:
            if key in self.cache:
                self.cache.move_to_end(key)
            self.cache[key] = value
            self.timestamps[key] = time.time()

            # 容量超過時の処理
            if len(self.cache) > self.capacity:
                oldest_key, _ = self.cache.popitem(last=False)
                del self.timestamps[oldest_key]
                self.stats['evictions'] += 1

    def remove(self, key: str) -> None:
        """
        キャッシュからデータを削除

        Args:
            key (str): 削除するキャッシュキー
        """
        with self.lock:
            if key in self.cache:
                del self.cache[key]
                del self.timestamps[key]

    def clear(self) -> None:
        """キャッシュをクリア"""
        with self.lock:
            self.cache.clear()
            self.timestamps.clear()

    def get_stats(self) -> Dict:
        """
        キャッシュの統計情報を取得

        Returns:
            Dict: キャッシュの統計情報
        """
        with self.lock:
            stats = self.stats.copy()
            stats.update({
                'size': len(self.cache),
                'capacity': self.capacity,
                'hit_rate': (
                    stats['hits'] / (stats['hits'] + stats['misses'])
                    if stats['hits'] + stats['misses'] > 0
                    else 0
                ),
            })
            return stats

class CacheManager:
    """
    複数のキャッシュを管理するマネージャークラス
    """
    def __init__(self):
        self.caches: Dict[str, LRUCache] = {}
        self.lock = threading.Lock()

    def get_cache(
        self,
        name: str,
        capacity: int = 1000,
        ttl: Optional[int] = None
    ) -> LRUCache:
        """
        指定された名前のキャッシュを取得または作成

        Args:
            name (str): キャッシュの名前
            capacity (int): 新規作成時のキャッシュ容量
            ttl (Optional[int]): 新規作成時のTTL

        Returns:
            LRUCache: キャッシュインスタンス
        """
        with self.lock:
            if name not in self.caches:
                self.caches[name] = LRUCache(capacity, ttl)
            return self.caches[name]

    def clear_all(self) -> None:
        """全てのキャッシュをクリア"""
        with self.lock:
            for cache in self.caches.values():
                cache.clear()

    def get_all_stats(self) -> Dict[str, Dict]:
        """
        全てのキャッシュの統計情報を取得

        Returns:
            Dict[str, Dict]: キャッシュ名をキーとする統計情報
        """
        with self.lock:
            return {
                name: cache.get_stats()
                for name, cache in self.caches.items()
            }

# グローバルなキャッシュマネージャーのインスタンス
cache_manager = CacheManager() 