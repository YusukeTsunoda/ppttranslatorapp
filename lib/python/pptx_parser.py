#!/usr/bin/env python3
import sys
import json
import os
from pptx import Presentation
from typing import List, Dict, Any
import subprocess
from pdf2image import convert_from_path

def convert_to_png(pptx_path: str, output_dir: str) -> tuple[List[str], tuple[int, int]]:
    """
    PPTXの各スライドをPNG画像に変換する
    
    Args:
        pptx_path (str): PPTXファイルのパス
        output_dir (str): 出力ディレクトリ
    
    Returns:
        tuple[List[str], tuple[int, int]]: 画像パスのリストと画像サイズ
    """
    try:
        # 出力ディレクトリが存在しない場合は作成
        os.makedirs(output_dir, exist_ok=True)
        
        # PPTXをPDFに変換
        pptx_name = os.path.splitext(os.path.basename(pptx_path))[0]
        pdf_path = os.path.join(output_dir, f"{pptx_name}.pdf")
        
        if sys.platform == "darwin":  # macOS
            # LibreOfficeのパスを確認
            libreoffice_path = subprocess.run(["which", "soffice"], capture_output=True, text=True).stdout.strip()
            
            result = subprocess.run(
                [libreoffice_path, "--headless", "--convert-to", "pdf", "--outdir", output_dir, pptx_path],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                return [], (0, 0)
        else:  # Linux
            result = subprocess.run(
                ["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", output_dir, pptx_path],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                return [], (0, 0)

        if not os.path.exists(pdf_path):
            return [], (0, 0)
            
        # PDFを画像に変換（16:9のアスペクト比を保持）
        try:
            # 高解像度で変換（1920x1080のサイズ）
            target_width = 1920
            target_height = int(target_width * 9 / 16)  # 1080px
            
            # popplerのパスを確認
            poppler_path = None
            if sys.platform == "darwin":  # macOS
                # Homebrewでインストールされたpopplerのパスを使用
                poppler_path = "/opt/homebrew/bin"
                if not os.path.exists(poppler_path):
                    poppler_path = "/usr/local/bin"
            
            # 高品質設定でPDFを画像に変換
            images = convert_from_path(
                pdf_path, 
                size=(target_width, target_height),
                poppler_path=poppler_path,
                dpi=300,  # 高解像度
                fmt="png",  # PNG形式で出力
                transparent=False,  # 透明度なし
                use_cropbox=True,  # クロップボックスを使用
                strict=False  # 厳密なエラーチェックを無効化
            )
            
            if not images:
                return [], (0, 0)
                
            # 実際の画像サイズを取得
            actual_width = images[0].width
            actual_height = images[0].height
            
        except Exception as e:
            return [], (0, 0)
        
        image_paths = []
        for i, image in enumerate(images):
            image_path = os.path.join(output_dir, f"slide_{i+1}.png")
            # 高品質で保存
            image.save(image_path, "PNG", quality=95, optimize=True)
            rel_path = f"slide_{i+1}.png"
            image_paths.append(rel_path)
        
        try:
            os.remove(pdf_path)
        except Exception:
            pass
        
        return image_paths, (actual_width, actual_height)
        
    except Exception:
        return [], (0, 0)

def convert_coordinates(x: float, y: float, width: float, height: float, 
                      slide_width: float, slide_height: float,
                      image_width: float, image_height: float) -> dict:
    """
    PowerPointの座標系（EMU）をピクセル座標に変換
    
    Args:
        x, y: 元の座標（EMU）
        width, height: 元のサイズ（EMU）
        slide_width: スライドの幅（EMU）
        slide_height: スライドの高さ（EMU）
        image_width: 画像の幅（ピクセル）
        image_height: 画像の高さ（ピクセル）
    
    Returns:
        dict: 変換後の座標とサイズ
    """
    # スライドと画像のアスペクト比を計算
    slide_aspect = slide_width / slide_height
    image_aspect = image_width / image_height
    
    # 基本のスケーリング係数を計算（幅に基づく）
    scale = image_width / slide_width
    
    # 座標を変換
    scaled_x = x * scale
    scaled_y = y * scale
    scaled_width = width * scale
    scaled_height = height * scale
    
    # アスペクト比の違いによる調整
    if slide_aspect != image_aspect:
        # 高さの差を計算
        expected_height = slide_height * scale
        height_diff = image_height - expected_height
        # Y座標を調整（中央揃え）
        scaled_y += height_diff / 2
    
    return {
        "x": round(scaled_x),
        "y": round(scaled_y),
        "width": round(scaled_width),
        "height": round(scaled_height)
    }

def extract_text_from_shape(shape):
    """シェイプからテキストを抽出し、フォーマット情報も保持する"""
    if not hasattr(shape, "text"):
        return None
    
    text = shape.text.strip()
    if not text:
        return None
    
    # テキスト情報を抽出
    text_info = {
        "text": text,
        "type": "text",
    }
    
    # 可能であればフォント情報も抽出
    try:
        if hasattr(shape, "text_frame") and shape.text_frame:
            # パラグラフごとの処理
            paragraphs_info = []
            for p in shape.text_frame.paragraphs:
                if not p.text.strip():
                    continue
                    
                # フォントサイズやスタイル情報を取得
                font_info = {}
                if p.runs and p.runs[0].font:
                    font = p.runs[0].font
                    if font.size:
                        # ポイント単位に変換（EMUから）
                        font_size = font.size / 12700
                        font_info["size"] = font_size
                    if font.name:
                        font_info["name"] = font.name
                    if font.bold is not None:
                        font_info["bold"] = font.bold
                    if font.italic is not None:
                        font_info["italic"] = font.italic
                
                paragraphs_info.append({
                    "text": p.text.strip(),
                    "font": font_info,
                    "alignment": str(p.alignment) if p.alignment else "left"
                })
            
            if paragraphs_info:
                text_info["paragraphs"] = paragraphs_info
    except Exception:
        # フォント情報の抽出に失敗しても続行
        pass
        
    return text_info

def parse_pptx(file_path: str, output_dir: str) -> List[Dict[str, Any]]:
    try:
        prs = Presentation(file_path)
        slides = []
        
        # スライドを画像に変換
        image_paths, (image_width, image_height) = convert_to_png(file_path, output_dir)
        
        if not image_paths:
            return []
            
        for slide_index, slide in enumerate(prs.slides):
            texts = []
            
            # スライドのサイズを取得
            slide_width = prs.slide_width
            slide_height = prs.slide_height
            
            for shape in slide.shapes:
                text_info = extract_text_from_shape(shape)
                if text_info:
                    # 座標を変換
                    position = convert_coordinates(
                        shape.left, shape.top, 
                        shape.width, shape.height,
                        slide_width, slide_height,
                        image_width, image_height
                    )
                    text_info["position"] = position
                    texts.append(text_info)
            
            # グループ化されたシェイプも処理
            def process_group_shapes(group_shape):
                group_texts = []
                for child in group_shape.shapes:
                    if hasattr(child, 'shapes'):  # ネストされたグループ
                        group_texts.extend(process_group_shapes(child))
                    else:
                        text_info = extract_text_from_shape(child)
                        if text_info:
                            # 座標を変換
                            position = convert_coordinates(
                                child.left + group_shape.left, 
                                child.top + group_shape.top,
                                child.width, child.height,
                                slide_width, slide_height,
                                image_width, image_height
                            )
                            text_info["position"] = position
                            group_texts.append(text_info)
                return group_texts
            
            # グループシェイプを処理
            for shape in slide.shapes:
                if hasattr(shape, 'shapes'):  # グループシェイプ
                    texts.extend(process_group_shapes(shape))
            
            slides.append({
                "index": slide_index,
                "texts": texts,
                "image_path": image_paths[slide_index] if slide_index < len(image_paths) else None
            })
        
        # 最終結果を構築
        result_structure = {
            "slides": slides
        }
        
        # 結果を標準出力に出力
        print(json.dumps(result_structure))
        return slides
        
    except Exception as e:
        # エラー時も適切なJSONを返す
        print(json.dumps({"slides": [], "error": str(e)}))
        return []

def update_pptx_with_translations(
    original_file: str,
    output_file: str,
    translations: Dict[int, List[Dict[str, str]]]
) -> bool:
    """
    翻訳されたテキストでPPTXファイルを更新する
    
    Args:
        original_file (str): 元のPPTXファイルパス
        output_file (str): 出力するPPTXファイルパス
        translations (Dict[int, List[Dict[str, str]]]): 
            スライドインデックスごとの翻訳テキスト情報
    
    Returns:
        bool: 成功した場合True
    """
    try:
        prs = Presentation(original_file)
        
        for slide_index, slide in enumerate(prs.slides):
            if slide_index not in translations:
                continue
                
            slide_translations = translations[slide_index]
            shape_map = {shape.shape_id: shape for shape in slide.shapes 
                        if hasattr(shape, "text")}
            
            for trans in slide_translations:
                shape_id = trans.get("shape_id")
                if shape_id in shape_map:
                    shape = shape_map[shape_id]
                    shape.text = trans["translated_text"]
        
        prs.save(output_file)
        return True
        
    except Exception:
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(1)
    
    pptx_file = sys.argv[1]
    output_dir = sys.argv[2]
    
    try:
        # PPTXファイルを解析
        slides = parse_pptx(pptx_file, output_dir)
        
        # 処理結果をチェック
        if not slides:
            sys.exit(1)
        
        # 正常終了
        sys.exit(0)
    except Exception:
        # エラー終了
        sys.exit(1)
