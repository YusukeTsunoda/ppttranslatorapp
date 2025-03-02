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
        
        print(f"Converting PPTX to PDF: {pptx_path} -> {pdf_path}", file=sys.stderr)
        
        if sys.platform == "darwin":  # macOS
            # LibreOfficeのパスを確認
            libreoffice_path = subprocess.run(["which", "soffice"], capture_output=True, text=True).stdout.strip()
            print(f"LibreOffice path: {libreoffice_path}", file=sys.stderr)
            
            result = subprocess.run(
                [libreoffice_path, "--headless", "--convert-to", "pdf", "--outdir", output_dir, pptx_path],
                capture_output=True,
                text=True
            )
            print(f"LibreOffice conversion stdout: {result.stdout}", file=sys.stderr)
            print(f"LibreOffice conversion stderr: {result.stderr}", file=sys.stderr)
            
            if result.returncode != 0:
                print(f"Error converting to PDF: {result.stderr}", file=sys.stderr)
                return [], (0, 0)
        else:  # Linux
            result = subprocess.run(
                ["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", output_dir, pptx_path],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                print(f"Error converting to PDF: {result.stderr}", file=sys.stderr)
                return [], (0, 0)

        if not os.path.exists(pdf_path):
            print(f"PDF file not found at: {pdf_path}", file=sys.stderr)
            return [], (0, 0)
            
        print(f"Converting PDF to images: {pdf_path}", file=sys.stderr)
        print(f"PDF file size: {os.path.getsize(pdf_path)} bytes", file=sys.stderr)
            
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
            
            print(f"Using poppler path: {poppler_path}", file=sys.stderr)
            
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
                print("No images were generated from PDF", file=sys.stderr)
                return [], (0, 0)
                
            # 実際の画像サイズを取得
            actual_width = images[0].width
            actual_height = images[0].height
            
            print(f"Generated image size: {actual_width}x{actual_height}", file=sys.stderr)
            print(f"Number of images generated: {len(images)}", file=sys.stderr)
            
        except Exception as e:
            print(f"Error converting PDF to images: {str(e)}", file=sys.stderr)
            return [], (0, 0)
        
        image_paths = []
        for i, image in enumerate(images):
            image_path = os.path.join(output_dir, f"slide_{i+1}.png")
            # 高品質で保存
            image.save(image_path, "PNG", quality=95, optimize=True)
            rel_path = f"slide_{i+1}.png"
            image_paths.append(rel_path)
            print(f"Saved image: {image_path} (size: {os.path.getsize(image_path)} bytes)", file=sys.stderr)
        
        try:
            os.remove(pdf_path)
            print(f"Removed temporary PDF: {pdf_path}", file=sys.stderr)
        except Exception as e:
            print(f"Warning: Could not delete temporary PDF: {str(e)}", file=sys.stderr)
        
        return image_paths, (actual_width, actual_height)
        
    except Exception as e:
        print(f"Error converting to PNG: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
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
    if hasattr(shape, "text"):
        return shape.text.strip()
    return ""

def parse_pptx(file_path: str, output_dir: str) -> List[Dict[str, Any]]:
    try:
        print(f"Processing PPTX file: {file_path}", file=sys.stderr)
        prs = Presentation(file_path)
        slides = []
        
        # スライドを画像に変換
        image_paths, (image_width, image_height) = convert_to_png(file_path, output_dir)
        
        if not image_paths:
            print("No images were generated", file=sys.stderr)
            return []
            
        for slide_index, slide in enumerate(prs.slides):
            texts = []
            
            # スライドのサイズを取得
            slide_width = prs.slide_width
            slide_height = prs.slide_height
            
            for shape in slide.shapes:
                text = extract_text_from_shape(shape)
                if text:
                    # 座標を変換
                    position = convert_coordinates(
                        shape.left, shape.top, 
                        shape.width, shape.height,
                        slide_width, slide_height,
                        image_width, image_height
                    )
                    texts.append({
                        "text": text,
                        "type": "text",
                        "position": position
                    })
            
            slides.append({
                "index": slide_index,
                "texts": texts,
                "image_path": image_paths[slide_index] if slide_index < len(image_paths) else None
            })
        
        return slides
        
    except Exception as e:
        print(f"Error parsing PPTX: {str(e)}", file=sys.stderr)
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
        
    except Exception as e:
        print(f"Error updating PPTX: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "ファイルパスと出力ディレクトリが必要です"}))
        sys.exit(1)
    
    try:
        file_path = sys.argv[1]
        output_dir = sys.argv[2]
        slides = parse_pptx(file_path, output_dir)
        print(json.dumps({"slides": slides}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
