import time
import psutil
import functools
from typing import Callable, Any
from .app import update_metric

def monitor_performance(func: Callable) -> Callable:
    """
    関数のパフォーマンスをモニタリングするデコレータ
    - 処理時間
    - メモリ使用量
    - エラー発生率
    を計測
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB単位

        try:
            result = func(*args, **kwargs)
            # 正常終了時はエラー率0%
            update_metric("error_rate", 0)
        except Exception as e:
            # エラー発生時はエラー率100%
            update_metric("error_rate", 100)
            raise e
        finally:
            # 処理時間を計測（ミリ秒単位）
            processing_time = (time.time() - start_time) * 1000
            update_metric("processing_time", processing_time)

            # メモリ使用量の変化を計測（MB単位）
            end_memory = psutil.Process().memory_info().rss / 1024 / 1024
            memory_diff = end_memory - start_memory
            update_metric("memory_usage", memory_diff)

        return result

    return wrapper

def batch_monitor(batch_size: int = 1) -> Callable:
    """
    バッチ処理用のモニタリングデコレータ
    バッチサイズに応じてメトリクスを正規化
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            start_memory = psutil.Process().memory_info().rss / 1024 / 1024

            try:
                result = func(*args, **kwargs)
                update_metric("error_rate", 0)
            except Exception as e:
                update_metric("error_rate", 100)
                raise e
            finally:
                # バッチサイズで正規化
                processing_time = ((time.time() - start_time) * 1000) / batch_size
                update_metric("processing_time", processing_time)

                memory_diff = (psutil.Process().memory_info().rss / 1024 / 1024 - start_memory) / batch_size
                update_metric("memory_usage", memory_diff)

            return result

        return wrapper
    return decorator 