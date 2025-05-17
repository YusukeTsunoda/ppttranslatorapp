# パフォーマンステストシステム

## セットアップ

1. 必要なパッケージのインストール
```bash
pip install -r requirements.txt
```

2. テストデータの生成
```python
from data_generation.test_data_generator import TestDataGenerator

generator = TestDataGenerator()

# 基本的なテストデータの生成
generator.generate_test_pptx(
    slide_count=10,
    text_boxes_per_slide=range(3, 8),
    languages=["ja", "en"]
)

# エッジケースの生成
generator.generate_edge_cases()

# データセットの生成
configurations = [
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
generator.generate_dataset("test_dataset_1", configurations)
```

3. パフォーマンス分析の実行
```python
from analysis.performance_analyzer import PerformanceAnalyzer

analyzer = PerformanceAnalyzer()

# 測定開始
analyzer.start_measurement("test_case_1", {"file_size": 1024})

# メトリクスの記録
analyzer.record_metric("processing_time", 1500)
analyzer.record_metric("memory_usage", 256)

# 測定終了
results = analyzer.end_measurement()

# トレンド分析
trend = analyzer.analyze_trend("processing_time")
```

4. モニタリングダッシュボードの起動
```bash
cd tests/performance/monitoring
uvicorn app:app --reload
```

## 機能

### パフォーマンス分析
- メトリクスの収集と保存
- トレンド分析
- 異常値検出
- ベースラインとの比較

### テストデータ生成
- 様々なサイズと内容のPPTXファイル生成
- エッジケースの生成
- データセット管理

### モニタリングダッシュボード
- リアルタイムメトリクス表示
- グラフによる可視化
- アラート設定
- 異常値の検出と表示

## ディレクトリ構造
```
tests/performance/
├── analysis/
│   └── performance_analyzer.py
├── data_generation/
│   └── test_data_generator.py
├── monitoring/
│   ├── app.py
│   └── static/
│       └── dashboard.js
└── data/
    └── (生成されたテストデータ)
```

## 使用例

### 1. パフォーマンステストの実行
```python
from analysis.performance_analyzer import PerformanceAnalyzer
from data_generation.test_data_generator import TestDataGenerator

# テストデータの準備
generator = TestDataGenerator()
test_file = generator.generate_test_pptx(
    slide_count=20,
    text_boxes_per_slide=range(5, 10)
)

# パフォーマンス測定
analyzer = PerformanceAnalyzer()
analyzer.start_measurement("translation_test", {
    "file": str(test_file),
    "slide_count": 20
})

# テスト実行
# ... テストコード ...

# メトリクス記録
analyzer.record_metric("processing_time", processing_time)
analyzer.record_metric("memory_usage", memory_usage)

# 測定終了
results = analyzer.end_measurement()
```

### 2. 異常値の検出
```python
# トレンド分析と異常値検出
trend = analyzer.analyze_trend("processing_time")
if trend["anomalies"]:
    print(f"異常値を検出: {trend['anomalies']}")
```

### 3. ベースライン比較
```python
# ベースラインの設定
analyzer.set_baseline({
    "processing_time": 1500,  # ms
    "memory_usage": 256      # MB
})

# 現在の測定値との比較
comparison = analyzer.compare_with_baseline({
    "processing_time": 1800,
    "memory_usage": 300
})
```

## 注意事項

1. メモリ使用量
- 大量のテストデータを生成する場合は、メモリ使用量に注意してください
- 必要に応じてガベージコレクションを実行してください

2. ストレージ
- テストデータは定期的にクリーンアップしてください
- 長期保存が必要なデータは別途バックアップを取ってください

3. パフォーマンス
- モニタリングダッシュボードの更新間隔は必要に応じて調整してください
- 大量のデータを扱う場合は、データの集計・サマリー化を検討してください 