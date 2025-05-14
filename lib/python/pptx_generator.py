#!/usr/bin/env python3
import sys
import json
from pptx import Presentation
from pptx.util import Pt, Inches, Emu
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor
from pptx.oxml.xmlchemy import OxmlElement
from typing import Dict, List, Any, Optional, Tuple
import math
import logging

# ロギングの設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('pptx_generator')

# EMUからピクセル、ピクセルからEMUへの変換関数
def emu_to_pixels(emu: int) -> float:
    """EMU単位をピクセルに変換"""
    return emu / 9525  # 1 pixel = 9525 EMU

def pixels_to_emu(pixels: float) -> int:
    """ピクセルをEMU単位に変換"""
    return int(pixels * 9525)  # 1 pixel = 9525 EMU

def apply_text_style(run, style: Dict):
    """テキストスタイルを適用"""
    try:
        if "fontSize" in style:
            run.font.size = Pt(style["fontSize"])
        if "fontName" in style:
            run.font.name = style["fontName"]
        elif "fontFamily" in style:
            run.font.name = style["fontFamily"]
        if "bold" in style:
            run.font.bold = style["bold"]
        if "italic" in style:
            run.font.italic = style["italic"]
        if "color" in style and isinstance(style["color"], dict):
            color = style["color"]
            if all(k in color for k in ['r', 'g', 'b']):
                run.font.color.rgb = RGBColor(color['r'], color['g'], color['b'])
        if "underline" in style:
            run.font.underline = style["underline"]
    except Exception as e:
        logger.warning(f"スタイル適用エラー: {e}")

def get_alignment(alignment_str: str) -> PP_ALIGN:
    """テキスト配置を文字列からPP_ALIGN値に変換"""
    alignment_map = {
        "left": PP_ALIGN.LEFT,
        "center": PP_ALIGN.CENTER,
        "right": PP_ALIGN.RIGHT,
        "justify": PP_ALIGN.JUSTIFY,
        "distribute": PP_ALIGN.DISTRIBUTE
    }
    return alignment_map.get(alignment_str.lower(), PP_ALIGN.LEFT)

def estimate_text_height(text: str, font_size: float, width: float) -> float:
    """テキストの高さを推定（簡易版）"""
    avg_char_width = font_size * 0.6  # 文字幅の平均
    chars_per_line = max(1, int(width / avg_char_width))
    lines = math.ceil(len(text) / chars_per_line)
    line_height = font_size * 1.2  # 1.2倍のライン高
    return lines * line_height

def adjust_text_box_size(shape, text: str, style: Dict, lang: str = "en") -> None:
    """テキストボックスのサイズと位置を調整"""
    # 言語による係数の調整
    lang_factors = {
        "en": 1.0,    # 英語（基準）
        "ja": 1.2,    # 日本語
        "zh": 1.2,    # 中国語
        "ko": 1.15,   # 韓国語
        "ru": 1.05,   # ロシア語
        "ar": 1.1,    # アラビア語
        "de": 1.1,    # ドイツ語
        "fr": 1.05,   # フランス語
        "es": 1.05,   # スペイン語
    }
    
    # デフォルトのフォントサイズ
    font_size = 12
    if "fontSize" in style:
        font_size = style["fontSize"]
    
    # 言語係数を取得
    lang_factor = lang_factors.get(lang, 1.0)
    
    # Auto-Fitを設定（テキストボックスにテキストを合わせる）
    shape.text_frame.auto_size = 1  # MSO_AUTO_SIZE.TEXT_TO_FIT_SHAPE
    
    # テキスト量が多い場合、ボックスの高さを自動的に拡大
    estimated_height = estimate_text_height(text, font_size, shape.width)
    if estimated_height > shape.height:
        shape.height = pixels_to_emu(emu_to_pixels(shape.height) * 1.3)  # 30%増加
    
    # 言語による幅の調整
    current_width = emu_to_pixels(shape.width)
    adjusted_width = current_width * lang_factor
    shape.width = pixels_to_emu(adjusted_width)
    
    return shape

def adjust_text_frame_properties(text_frame, style: Dict, lang: str = "en") -> None:
    """テキストフレームのプロパティを調整"""
    # デフォルトの余白設定
    try:
        # 余白の調整（EMU単位）
        text_frame.margin_left = Emu(73152)    # 約0.1インチ
        text_frame.margin_right = Emu(73152)   # 約0.1インチ
        text_frame.margin_top = Emu(36576)     # 約0.05インチ
        text_frame.margin_bottom = Emu(36576)  # 約0.05インチ
        
        # 縦方向の配置（上、中央、下）
        text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
        
        # ワードラップを有効化
        text_frame.word_wrap = True
        
        # 方向が右から左（RTL）の言語の場合
        rtl_languages = ["ar", "he", "fa", "ur"]
        if lang in rtl_languages:
            set_rtl_text_direction(text_frame)
    except Exception as e:
        logger.warning(f"テキストフレーム調整エラー: {e}")

def set_rtl_text_direction(text_frame) -> None:
    """テキストフレームを右から左（RTL）に設定"""
    try:
        # xmlタグを直接設定
        p = text_frame._element.get_or_add_p()
        pPr = p.get_or_add_pPr()
        
        # rtl属性を設定
        rtl = OxmlElement('a:rtl')
        rtl.set('val', '1')
        pPr.append(rtl)
    except Exception as e:
        logger.warning(f"RTL設定エラー: {e}")

def create_translated_pptx(original_pptx_path: str, translations: List[Dict], output_path: str):
    """翻訳済みのPPTXファイルを生成"""
    try:
        logger.info(f"翻訳PPTXの生成開始: {original_pptx_path} -> {output_path}")
        
        # 元のプレゼンテーションを読み込み
        prs = Presentation(original_pptx_path)
        
        # プレゼンテーションのメタデータを更新
        if hasattr(prs, 'core_properties'):
            if hasattr(prs.core_properties, 'title') and prs.core_properties.title:
                prs.core_properties.title += " (Translated)"
        
        # 翻訳データの検証
        if not isinstance(translations, list):
            logger.error("翻訳データが無効です: リスト形式ではありません")
            raise ValueError("翻訳データは配列である必要があります")
        
        logger.info(f"スライド数: 元={len(prs.slides)}, 翻訳={len(translations)}")
        
        # 各スライドの翻訳を適用
        for slide_idx, slide_data in enumerate(translations):
            if slide_idx >= len(prs.slides):
                logger.warning(f"スライド {slide_idx + 1} が元のプレゼンテーションに存在しません")
                continue
                
            slide = prs.slides[slide_idx]
            texts = slide_data.get("texts", [])
            target_language = slide_data.get("targetLanguage", "en")
            
            logger.info(f"スライド {slide_idx + 1} の処理 - テキスト要素数: {len(texts)}")
            
            # 既存のテキストボックスを更新
            shape_index = 0
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape_index < len(texts):
                    text_data = texts[shape_index]
                    
                    # 翻訳テキストの取得
                    translation = text_data.get("translation", "") or text_data.get("text", "")
                    
                    # シェイプの種類を確認（テキストボックス、プレースホルダー等）
                    shape_type = None
                    if hasattr(shape, 'shape_type'):
                        shape_type = shape.shape_type
                    
                    logger.info(f"テキスト要素 {shape_index + 1}: タイプ={shape_type}, テキスト長={len(translation)}")
                    
                    # テキストボックスの位置とサイズを更新
                    position = text_data.get("position", {})
                    if position:
                        # スケール係数を元に戻して位置を調整
                        shape.left = pixels_to_emu(position.get("x", 0) * 2)  # スケール係数を元に戻す
                        shape.top = pixels_to_emu(position.get("y", 0) * 2)    # スケール係数を元に戻す
                        
                        # テキストボックスの幅と高さを言語に応じて調整
                        width = pixels_to_emu(position.get("width", 0) * 2)
                        height = pixels_to_emu(position.get("height", 0) * 2)
                        
                        # テキストボックスのサイズを設定
                        shape.width = width
                        shape.height = height
                    
                    # スタイル情報を取得
                    style = text_data.get("style", {})
                    
                    # テキストを更新
                    if shape.text_frame:
                        try:
                            # テキストフレームの基本プロパティを調整
                            adjust_text_frame_properties(shape.text_frame, style, target_language)
                            
                            # 既存のテキストをクリア
                            shape.text_frame.clear()
                            
                            # 翻訳テキストを追加
                            p = shape.text_frame.paragraphs[0]
                            
                            # 段落の配置を設定
                            alignment = text_data.get("alignment", "left")
                            p.alignment = get_alignment(alignment)
                            
                            # テキストとスタイルを追加
                            run = p.add_run()
                            run.text = translation
                            
                            # スタイルを適用
                            if style:
                                apply_text_style(run, style)
                            
                            # テキストボックスのサイズを調整
                            adjust_text_box_size(shape, translation, style, target_language)
                            
                            logger.info(f"テキスト要素 {shape_index + 1} が更新されました")
                        except Exception as e:
                            logger.error(f"テキスト更新エラー (スライド {slide_idx + 1}, テキスト {shape_index + 1}): {e}")
                    
                    shape_index += 1
        
        # 保存
        prs.save(output_path)
        logger.info(f"翻訳PPTXが生成されました: {output_path}")
        
        return {
            "status": "success",
            "message": "PPTX file generated successfully",
            "path": output_path
        }
        
    except Exception as e:
        logger.error(f"PPTX生成エラー: {e}", exc_info=True)
        return {
            "status": "error",
            "message": f"Failed to generate PPTX: {str(e)}",
            "error": str(e)
        }

if __name__ == "__main__":
    # コマンドライン引数からパスを取得
    if len(sys.argv) != 4:
        print("Usage: python pptx_generator.py <original_pptx_path> <translations_json_path> <output_path>")
        sys.exit(1)
    
    original_pptx_path = sys.argv[1]
    translations_json_path = sys.argv[2]
    output_path = sys.argv[3]
    
    # JSONファイルから翻訳データを読み込む
    try:
        with open(translations_json_path, 'r', encoding='utf-8') as f:
            translations = json.load(f)
    except Exception as e:
        print(f"Error loading translations JSON: {e}")
        sys.exit(1)
    
    # PPTXを生成
    result = create_translated_pptx(original_pptx_path, translations, output_path)
    
    # 結果を出力
    print(json.dumps(result))