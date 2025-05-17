import pytest
import time
from pathlib import Path
from python_backend.monitoring.decorators import monitor_performance, batch_monitor
from lib.pptx import PPTXProcessor
from tests.utils.test_data_generator import generate_test_pptx

class TestPPTXProcessingPerformance:
    @pytest.fixture(scope="class")
    def test_files(self):
        """テスト用のPPTXファイルを生成"""
        files = []
        sizes = [10, 50, 100]  # スライド数
        for size in sizes:
            file_path = generate_test_pptx(slide_count=size)
            files.append(file_path)
        yield files
        # クリーンアップ
        for file in files:
            Path(file).unlink(missing_ok=True)

    @monitor_performance
    def test_single_file_processing(self, test_files):
        """単一ファイル処理のパフォーマンステスト"""
        processor = PPTXProcessor()
        for file_path in test_files:
            result = processor.process_file(file_path)
            assert result is not None

    @batch_monitor(batch_size=3)
    def test_batch_processing(self, test_files):
        """バッチ処理のパフォーマンステスト"""
        processor = PPTXProcessor()
        results = processor.process_files(test_files)
        assert len(results) == len(test_files)

    def test_memory_usage_under_limit(self, test_files):
        """メモリ使用量の制限テスト"""
        import psutil
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        processor = PPTXProcessor()
        for file_path in test_files:
            processor.process_file(file_path)
            current_memory = process.memory_info().rss / 1024 / 1024
            memory_increase = current_memory - initial_memory
            assert memory_increase < 500  # 500MB以下に制限

    def test_processing_time_limit(self, test_files):
        """処理時間の制限テスト"""
        processor = PPTXProcessor()
        for file_path in test_files:
            start_time = time.time()
            processor.process_file(file_path)
            processing_time = time.time() - start_time
            # ファイルサイズに応じて制限時間を調整
            slide_count = len(processor.get_slide_count(file_path))
            time_limit = max(30, slide_count * 0.5)  # 基本30秒 + スライドあたり0.5秒
            assert processing_time < time_limit 