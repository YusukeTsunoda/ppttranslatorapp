#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
レイアウト調整ユーティリティ
翻訳後のテキストレイアウトを調整するための機能を提供します。
"""

import os
import sys
import json
import logging
from typing import Dict, List, Any, Tuple, Optional, Union
import math

# ロギング設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('layout_utils')

# 言語コード
LanguageCode = str  # 'ja', 'en', 'zh', 'ko', 'fr', 'de', 'es', 'it', 'ru', 'ar', 'th', 'vi'

# テキストボックス情報
class TextBoxInfo:
    def __init__(self, 
                 id: str, 
                 text: str, 
                 x: float, 
                 y: float, 
                 width: float, 
                 height: float,
                 font_name: Optional[str] = None,
                 font_size: Optional[float] = None,
                 font_color: Optional[str] = None,
                 alignment: Optional[str] = None,
                 vertical: bool = False,
                 rtl: bool = False,
                 z_order: int = 0):
        self.id = id
        self.text = text
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.font_name = font_name
        self.font_size = font_size
        self.font_color = font_color
        self.alignment = alignment
        self.vertical = vertical
        self.rtl = rtl
        self.z_order = z_order
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換"""
        return {
            'id': self.id,
            'text': self.text,
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height,
            'font_name': self.font_name,
            'font_size': self.font_size,
            'font_color': self.font_color,
            'alignment': self.alignment,
            'vertical': self.vertical,
            'rtl': self.rtl,
            'z_order': self.z_order
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TextBoxInfo':
        """辞書形式から生成"""
        return cls(
            id=data.get('id', ''),
            text=data.get('text', ''),
            x=data.get('x', 0),
            y=data.get('y', 0),
            width=data.get('width', 0),
            height=data.get('height', 0),
            font_name=data.get('font_name'),
            font_size=data.get('font_size'),
            font_color=data.get('font_color'),
            alignment=data.get('alignment'),
            vertical=data.get('vertical', False),
            rtl=data.get('rtl', False),
            z_order=data.get('z_order', 0)
        )

# 調整後のテキストボックス情報
class AdjustedTextBoxInfo(TextBoxInfo):
    def __init__(self, 
                 text_box: TextBoxInfo,
                 original_width: float,
                 original_height: float,
                 original_x: float,
                 original_y: float,
                 original_font_name: Optional[str] = None,
                 adjustment_ratio: float = 1.0,
                 overflow_detected: bool = False,
                 collision_detected: bool = False):
        super().__init__(
            id=text_box.id,
            text=text_box.text,
            x=text_box.x,
            y=text_box.y,
            width=text_box.width,
            height=text_box.height,
            font_name=text_box.font_name,
            font_size=text_box.font_size,
            font_color=text_box.font_color,
            alignment=text_box.alignment,
            vertical=text_box.vertical,
            rtl=text_box.rtl,
            z_order=text_box.z_order
        )
        self.original_width = original_width
        self.original_height = original_height
        self.original_x = original_x
        self.original_y = original_y
        self.original_font_name = original_font_name
        self.adjustment_ratio = adjustment_ratio
        self.overflow_detected = overflow_detected
        self.collision_detected = collision_detected
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換"""
        result = super().to_dict()
        result.update({
            'original_width': self.original_width,
            'original_height': self.original_height,
            'original_x': self.original_x,
            'original_y': self.original_y,
            'original_font_name': self.original_font_name,
            'adjustment_ratio': self.adjustment_ratio,
            'overflow_detected': self.overflow_detected,
            'collision_detected': self.collision_detected
        })
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AdjustedTextBoxInfo':
        """辞書形式から生成"""
        text_box = TextBoxInfo.from_dict(data)
        return cls(
            text_box=text_box,
            original_width=data.get('original_width', text_box.width),
            original_height=data.get('original_height', text_box.height),
            original_x=data.get('original_x', text_box.x),
            original_y=data.get('original_y', text_box.y),
            original_font_name=data.get('original_font_name', text_box.font_name),
            adjustment_ratio=data.get('adjustment_ratio', 1.0),
            overflow_detected=data.get('overflow_detected', False),
            collision_detected=data.get('collision_detected', False)
        )

# テキスト長変動データ
class TextExpansionData:
    def __init__(self,
                 average_expansion_ratio: float,
                 standard_deviation: float,
                 confidence_interval_95: Tuple[float, float],
                 sample_size: int,
                 last_updated: str):
        self.average_expansion_ratio = average_expansion_ratio
        self.standard_deviation = standard_deviation
        self.confidence_interval_95 = confidence_interval_95
        self.sample_size = sample_size
        self.last_updated = last_updated
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換"""
        return {
            'average_expansion_ratio': self.average_expansion_ratio,
            'standard_deviation': self.standard_deviation,
            'confidence_interval_95': {
                'min': self.confidence_interval_95[0],
                'max': self.confidence_interval_95[1]
            },
            'sample_size': self.sample_size,
            'last_updated': self.last_updated
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TextExpansionData':
        """辞書形式から生成"""
        confidence_interval = data.get('confidence_interval_95', {})
        return cls(
            average_expansion_ratio=data.get('average_expansion_ratio', 1.0),
            standard_deviation=data.get('standard_deviation', 0.1),
            confidence_interval_95=(
                confidence_interval.get('min', 0.9),
                confidence_interval.get('max', 1.1)
            ),
            sample_size=data.get('sample_size', 0),
            last_updated=data.get('last_updated', '')
        )

# デフォルトの拡大率（言語ペアごとのデータがない場合に使用）
DEFAULT_EXPANSION_RATIOS = {
    'ja-en': 1.3,   # 日本語→英語: 約30%拡大
    'en-ja': 0.8,   # 英語→日本語: 約20%縮小
    'ja-zh': 0.9,   # 日本語→中国語: 約10%縮小
    'zh-ja': 1.1,   # 中国語→日本語: 約10%拡大
    'en-fr': 1.15,  # 英語→フランス語: 約15%拡大
    'en-de': 1.35,  # 英語→ドイツ語: 約35%拡大
    'en-es': 1.25,  # 英語→スペイン語: 約25%拡大
    'en-ru': 1.3,   # 英語→ロシア語: 約30%拡大
    'en-ar': 1.25,  # 英語→アラビア語: 約25%拡大
    'default': 1.2  # デフォルト: 20%の余裕を見る
}

# 言語別のオフセットパラメータ
LANGUAGE_OFFSETS = {
    'ja': {'x': 0, 'y': 0},      # 日本語（基準）
    'en': {'x': 0, 'y': 0},      # 英語
    'zh': {'x': 0, 'y': 0},      # 中国語
    'ko': {'x': 0, 'y': 0},      # 韓国語
    'fr': {'x': 0, 'y': 0},      # フランス語
    'de': {'x': 0, 'y': 0},      # ドイツ語
    'es': {'x': 0, 'y': 0},      # スペイン語
    'it': {'x': 0, 'y': 0},      # イタリア語
    'ru': {'x': 0, 'y': 0},      # ロシア語
    'ar': {'x': 5, 'y': 0},      # アラビア語（右から左への言語なので、X方向にオフセット）
    'th': {'x': 0, 'y': 2},      # タイ語（アセンダー/ディセンダーが多いのでY方向にオフセット）
    'vi': {'x': 0, 'y': 0}       # ベトナム語
}

def get_language_pair_key(source: str, target: str) -> str:
    """言語ペアのキーを生成する"""
    return f"{source}-{target}"

def get_expansion_ratio(source: str, target: str, use_max_confidence: bool = False) -> float:
    """言語ペアの拡大率を取得する"""
    pair_key = get_language_pair_key(source, target)
    
    # データがある場合はそれを使用（実際の実装ではデータベースやファイルから読み込む）
    # ここではデフォルト値を使用
    if pair_key in DEFAULT_EXPANSION_RATIOS:
        return DEFAULT_EXPANSION_RATIOS[pair_key]
    
    # 逆方向のデータがある場合は逆数を使用
    reverse_pair_key = get_language_pair_key(target, source)
    if reverse_pair_key in DEFAULT_EXPANSION_RATIOS:
        return 1 / DEFAULT_EXPANSION_RATIOS[reverse_pair_key]
    
    # 最終的にはデフォルト値を返す
    return DEFAULT_EXPANSION_RATIOS['default']

def adjust_text_box_size(
    width: float,
    height: float,
    source: str,
    target: str,
    safety_margin: float = 0.1
) -> Tuple[float, float]:
    """テキストボックスのサイズを調整する"""
    expansion_ratio = get_expansion_ratio(source, target, True)
    adjusted_ratio = expansion_ratio * (1 + safety_margin)
    
    # 幅と高さの両方を調整（面積が拡大率に比例するように）
    area_ratio = math.sqrt(adjusted_ratio)
    
    return (
        width * area_ratio,
        height * area_ratio
    )

def check_collision(box1: TextBoxInfo, box2: TextBoxInfo) -> bool:
    """2つのテキストボックス間の衝突を検出する"""
    # 境界ボックスの交差を検出
    return (
        box1.x < box2.x + box2.width and
        box1.x + box1.width > box2.x and
        box1.y < box2.y + box2.height and
        box1.y + box1.height > box2.y
    )

def resolve_collision(box1: AdjustedTextBoxInfo, box2: AdjustedTextBoxInfo) -> None:
    """衝突を回避する"""
    # Z順序が大きい方を移動（上に表示される要素）
    box_to_move = box1 if (box1.z_order or 0) > (box2.z_order or 0) else box2
    
    # 重なりの量を計算
    overlap_x = min(box1.x + box1.width, box2.x + box2.width) - max(box1.x, box2.x)
    overlap_y = min(box1.y + box1.height, box2.y + box2.height) - max(box1.y, box2.y)
    
    # X方向とY方向のどちらに移動するか決定（より小さい重なりの方向に移動）
    if overlap_x < overlap_y:
        # X方向に移動
        if box_to_move.x < (box2.x if box_to_move == box1 else box1.x):
            box_to_move.x -= overlap_x + 5  # 少し余裕を持たせる
        else:
            box_to_move.x += overlap_x + 5
    else:
        # Y方向に移動
        if box_to_move.y < (box2.y if box_to_move == box1 else box1.y):
            box_to_move.y -= overlap_y + 5
        else:
            box_to_move.y += overlap_y + 5

def adjust_layout(
    text_boxes: List[TextBoxInfo],
    source_language: str,
    target_language: str,
    options: Dict[str, Any] = None
) -> List[AdjustedTextBoxInfo]:
    """テキストボックスのレイアウトを調整する"""
    # デフォルトオプション
    default_options = {
        'enable_auto_resize': True,
        'resize_strategy': 'both',
        'max_width_expansion': 1.5,
        'max_height_expansion': 1.5,
        'apply_font_mapping': True,
        'apply_language_offset': True,
        'detect_collisions': True,
        'safety_margin': 0.1
    }
    
    # オプションをマージ
    if options is None:
        options = {}
    
    opts = {**default_options, **options}
    
    # 調整後のテキストボックス情報を格納する配列
    adjusted_text_boxes = []
    
    # 各テキストボックスを調整
    for text_box in text_boxes:
        # 元の情報を保存
        adjusted = AdjustedTextBoxInfo(
            text_box=text_box,
            original_width=text_box.width,
            original_height=text_box.height,
            original_x=text_box.x,
            original_y=text_box.y,
            original_font_name=text_box.font_name
        )
        
        # テキストボックスのサイズを調整
        if opts['enable_auto_resize']:
            # テキスト長変動に基づくサイズ調整
            adjusted_width, adjusted_height = adjust_text_box_size(
                text_box.width,
                text_box.height,
                source_language,
                target_language,
                opts['safety_margin']
            )
            
            # リサイズ戦略に基づいて適用
            if opts['resize_strategy'] in ['width', 'both']:
                adjusted.width = min(
                    adjusted_width,
                    text_box.width * opts['max_width_expansion']
                )
            
            if opts['resize_strategy'] in ['height', 'both']:
                adjusted.height = min(
                    adjusted_height,
                    text_box.height * opts['max_height_expansion']
                )
            
            # 調整率を計算
            adjusted.adjustment_ratio = (adjusted.width * adjusted.height) / (text_box.width * text_box.height)
            
            # オーバーフロー検出
            expansion_ratio = get_expansion_ratio(
                source_language,
                target_language,
                True
            )
            
            if adjusted.adjustment_ratio < expansion_ratio:
                adjusted.overflow_detected = True
        
        # 言語別オフセットを適用
        if opts['apply_language_offset']:
            source_offset = LANGUAGE_OFFSETS.get(source_language, {'x': 0, 'y': 0})
            target_offset = LANGUAGE_OFFSETS.get(target_language, {'x': 0, 'y': 0})
            
            # 相対オフセットを計算
            relative_offset = {
                'x': target_offset['x'] - source_offset['x'],
                'y': target_offset['y'] - source_offset['y']
            }
            
            # 縦書きの場合はX/Y軸を入れ替え
            if text_box.vertical:
                adjusted.x += relative_offset['y']
                adjusted.y += relative_offset['x']
            else:
                adjusted.x += relative_offset['x']
                adjusted.y += relative_offset['y']
            
            # RTL（右から左）の場合は特別な処理
            if text_box.rtl:
                # RTLの場合、X座標は右端を基準にするため、幅の変化分だけX座標を調整
                width_diff = adjusted.width - text_box.width
                adjusted.x -= width_diff
        
        adjusted_text_boxes.append(adjusted)
    
    # 衝突検出と回避
    if opts['detect_collisions']:
        # Z順序でソート
        adjusted_text_boxes.sort(key=lambda box: box.z_order or 0)
        
        # 各テキストボックスについて衝突を検出
        for i in range(len(adjusted_text_boxes)):
            box1 = adjusted_text_boxes[i]
            
            for j in range(i + 1, len(adjusted_text_boxes)):
                box2 = adjusted_text_boxes[j]
                
                # 衝突を検出
                if check_collision(box1, box2):
                    box1.collision_detected = True
                    box2.collision_detected = True
                    
                    # 衝突回避
                    resolve_collision(box1, box2)
    
    return adjusted_text_boxes

if __name__ == "__main__":
    # テスト用コード
    text_boxes = [
        TextBoxInfo(
            id="1",
            text="こんにちは、世界！",
            x=100,
            y=100,
            width=200,
            height=50,
            font_name="Meiryo",
            font_size=12,
            alignment="left"
        ),
        TextBoxInfo(
            id="2",
            text="Hello, World!",
            x=100,
            y=200,
            width=150,
            height=50,
            font_name="Arial",
            font_size=12,
            alignment="left"
        )
    ]
    
    adjusted = adjust_layout(text_boxes, "ja", "en")
    
    print(json.dumps([box.to_dict() for box in adjusted], indent=2, ensure_ascii=False))
