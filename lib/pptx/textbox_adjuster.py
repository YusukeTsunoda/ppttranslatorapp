from pptx.util import Pt, Inches
from pptx.enum.text import MSO_AUTO_SIZE
from PIL import ImageFont, ImageDraw, Image
import math

class TextboxAdjuster:
    def __init__(self, shape):
        """
        テキストボックスの調整を行うクラス
        
        Args:
            shape: pptx.shapes.autoshape.Shape オブジェクト
        """
        self.shape = shape
        self.text_frame = shape.text_frame

    def adjust_size(self):
        """
        テキストボックスのサイズを調整する
        
        テキストボックスの auto_size 設定に応じて、適切なサイズ調整を行う
        """
        if self.text_frame.auto_size == MSO_AUTO_SIZE.NONE:
            return  # サイズ調整なし
        
        elif self.text_frame.auto_size == MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXT:
            self._adjust_shape_to_fit_text()
        
        elif self.text_frame.auto_size == MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE:
            self._adjust_text_to_fit_shape()

    def _adjust_shape_to_fit_text(self):
        """
        テキストに合わせてシェイプのサイズを調整する
        """
        # マージンを考慮
        total_margin_height = int(
            self.text_frame.margin_top +
            self.text_frame.margin_bottom
        )
        
        # 各段落の高さを計算
        total_height = 0
        for paragraph in self.text_frame.paragraphs:
            if not paragraph.text:
                continue
            
            # フォントサイズを取得（デフォルトは12pt）
            font_size = paragraph.font.size or Pt(12)
            
            # 行の高さを計算（フォントサイズの1.2倍を基本とする）
            line_height = int(font_size * 1.2)
            
            # テキストの折り返しを考慮して行数を概算
            available_width = int(self.shape.width - (
                self.text_frame.margin_left +
                self.text_frame.margin_right
            ))
            
            # テキストの幅を概算（日本語は1文字2em、英数字は1文字0.6emとして概算）
            text = paragraph.text
            japanese_chars = sum(1 for c in text if ord(c) > 0x3000)
            other_chars = len(text) - japanese_chars
            text_width = int((japanese_chars * 2 + other_chars * 0.6) * font_size)
            
            # 必要な行数を計算
            num_lines = math.ceil(text_width / available_width)
            
            # 段落の高さを計算
            paragraph_height = line_height * num_lines
            
            # 段落前後の間隔を追加
            if paragraph.space_before:
                paragraph_height += int(paragraph.space_before)
            if paragraph.space_after:
                paragraph_height += int(paragraph.space_after)
            
            total_height += paragraph_height
        
        # 最終的な高さを設定（マージンを加算）
        new_height = int(total_height + total_margin_height)
        
        # 最小高さ（1インチ）を下回らないようにする
        min_height = int(Inches(1))
        self.shape.height = max(new_height, min_height)

    def _adjust_text_to_fit_shape(self):
        """
        シェイプに合わせてテキストのサイズを調整する
        """
        # 利用可能な領域を計算
        available_width = int(self.shape.width - (
            self.text_frame.margin_left +
            self.text_frame.margin_right
        ))
        available_height = int(self.shape.height - (
            self.text_frame.margin_top +
            self.text_frame.margin_bottom
        ))
        
        # 初期フォントサイズと最小フォントサイズ
        initial_font_size = Pt(12)  # デフォルトサイズ
        min_font_size = Pt(6)  # 最小サイズ
        
        def get_text_size(text, font_size):
            """
            指定されたフォントサイズでのテキストのサイズを取得
            
            Args:
                text: テキスト
                font_size: フォントサイズ（EMU）
            
            Returns:
                (width, height): テキストの幅と高さ（EMU）
            """
            try:
                # フォントサイズをEMUからポイントに変換（1pt = 12700 EMU）
                pt_size = int(font_size / 12700)
                # ポイントからピクセルに変換（概算）
                pixel_size = int(pt_size * 4/3)  # 1pt ≈ 1.33px
                font = ImageFont.truetype("Arial.ttf", pixel_size)
            except OSError:
                font = ImageFont.load_default()
            
            # テキストのバウンディングボックスを取得
            dummy_image = Image.new('RGB', (1, 1))
            draw = ImageDraw.Draw(dummy_image)
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            # ピクセルからEMUに変換（概算）
            return (
                int(text_width * 12700 * 3/4),  # px * EMU/pt * pt/px
                int(text_height * 12700 * 3/4)
            )
        
        def find_fitting_font_size(text, max_width, max_height, initial_size, min_size):
            """
            テキストがボックスに収まる最大のフォントサイズを見つける
            """
            current_size = initial_size
            
            while current_size >= min_size:
                text_width, text_height = get_text_size(text, current_size)
                
                if text_width <= max_width and text_height <= max_height:
                    return current_size
                
                current_size = int(current_size * 0.9)  # 10%ずつ減少
            
            return min_size
        
        # 全テキストを結合（改行を考慮）
        all_text = "\n".join(p.text for p in self.text_frame.paragraphs if p.text)
        
        # 適切なフォントサイズを計算
        fitting_size = find_fitting_font_size(
            all_text,
            available_width,
            available_height,
            initial_font_size,
            min_font_size
        )
        
        # 全ての段落のフォントサイズを設定
        for paragraph in self.text_frame.paragraphs:
            if paragraph.text:
                paragraph.font.size = fitting_size 