from pathlib import Path
from typing import Dict, List
import pytest
from data_generation.test_data_generator import TestDataGenerator
from analysis.performance_analyzer import PerformanceAnalyzer
from analysis.utils import measure_time, get_memory_usage, PerformanceMonitor

class TestCase:
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.monitor = PerformanceMonitor(Path("tests/performance/data"))

    async def setup(self):
        """テストの前準備"""
        pass

    async def run(self):
        """テストを実行"""
        pass

    async def cleanup(self):
        """テスト後のクリーンアップ"""
        pass

class PPTXProcessingTest(TestCase):
    def __init__(self):
        super().__init__(
            name="pptx_processing_test",
            description="PPTXファイルの処理パフォーマンスをテスト"
        )
        self.generator = TestDataGenerator()
        self.test_files: List[Path] = []

    async def setup(self):
        """テストファイルを生成"""
        # 基本的なテストケース
        self.test_files.append(
            self.generator.generate_test_pptx(
                slide_count=10,
                text_boxes_per_slide=range(3, 8),
                languages=["ja", "en"]
            )
        )

        # エッジケース
        self.test_files.extend(self.generator.generate_edge_cases())

    @measure_time
    def process_file(self, file_path: Path) -> Dict:
        """PPTXファイルを処理（実際の処理ロジックに置き換える）"""
        # ここに実際のPPTX処理ロジックを実装
        return {"status": "success"}

    async def run(self):
        """テストを実行"""
        self.monitor.start()

        for file_path in self.test_files:
            # メモリ使用量を記録
            initial_memory = get_memory_usage()
            
            # ファイル処理を実行
            result, processing_time = self.process_file(file_path)
            
            # メモリ使用量の変化を計算
            memory_usage = get_memory_usage() - initial_memory

            # メトリクスを記録
            self.monitor.record("processing_time", processing_time, {
                "file": str(file_path),
                "file_size": file_path.stat().st_size
            })
            self.monitor.record("memory_usage", memory_usage, {
                "file": str(file_path)
            })

        return self.monitor.stop()

    async def cleanup(self):
        """テストファイルを削除"""
        for file_path in self.test_files:
            try:
                file_path.unlink()
                # 関連するメタデータファイルも削除
                metadata_path = file_path.with_suffix(".json")
                if metadata_path.exists():
                    metadata_path.unlink()
            except Exception as e:
                print(f"Warning: Failed to delete {file_path}: {e}")

class BatchProcessingTest(TestCase):
    def __init__(self):
        super().__init__(
            name="batch_processing_test",
            description="複数ファイルの一括処理パフォーマンスをテスト"
        )
        self.generator = TestDataGenerator()
        self.dataset_name = "batch_test"
        self.configurations = [
            {
                "category": "small",
                "slide_count": 5,
                "text_boxes_per_slide": range(2, 4)
            },
            {
                "category": "medium",
                "slide_count": 20,
                "text_boxes_per_slide": range(5, 10)
            },
            {
                "category": "large",
                "slide_count": 50,
                "text_boxes_per_slide": range(10, 15)
            }
        ]
        self.generated_files: Dict[str, List[Path]] = {}

    async def setup(self):
        """テストデータセットを生成"""
        self.generated_files = self.generator.generate_dataset(
            self.dataset_name,
            self.configurations
        )

    @measure_time
    def process_batch(self, files: List[Path]) -> Dict:
        """ファイルバッチを処理（実際の処理ロジックに置き換える）"""
        # ここに実際のバッチ処理ロジックを実装
        return {"status": "success", "processed_count": len(files)}

    async def run(self):
        """テストを実行"""
        self.monitor.start()

        for category, files in self.generated_files.items():
            # メモリ使用量を記録
            initial_memory = get_memory_usage()
            
            # バッチ処理を実行
            result, processing_time = self.process_batch(files)
            
            # メモリ使用量の変化を計算
            memory_usage = get_memory_usage() - initial_memory

            # メトリクスを記録
            self.monitor.record("batch_processing_time", processing_time, {
                "category": category,
                "file_count": len(files)
            })
            self.monitor.record("batch_memory_usage", memory_usage, {
                "category": category,
                "file_count": len(files)
            })

        return self.monitor.stop()

    async def cleanup(self):
        """テストファイルを削除"""
        for files in self.generated_files.values():
            for file_path in files:
                try:
                    file_path.unlink()
                    # 関連するメタデータファイルも削除
                    metadata_path = file_path.with_suffix(".json")
                    if metadata_path.exists():
                        metadata_path.unlink()
                except Exception as e:
                    print(f"Warning: Failed to delete {file_path}: {e}")

@pytest.mark.asyncio
async def test_pptx_processing():
    """PPTXファイル処理のパフォーマンステスト"""
    test = PPTXProcessingTest()
    try:
        await test.setup()
        results = await test.run()
        # 結果の検証
        assert results["duration"] > 0
        assert len(results["measurements"]) > 0
    finally:
        await test.cleanup()

@pytest.mark.asyncio
async def test_batch_processing():
    """バッチ処理のパフォーマンステスト"""
    test = BatchProcessingTest()
    try:
        await test.setup()
        results = await test.run()
        # 結果の検証
        assert results["duration"] > 0
        assert len(results["measurements"]) > 0
    finally:
        await test.cleanup() 