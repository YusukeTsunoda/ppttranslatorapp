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
        # デバッグ出力を追加
        print(f"Starting convert_to_png: pptx_path={pptx_path}, output_dir={output_dir}", file=sys.stderr)
        
        # 出力ディレクトリが存在しない場合は作成
        os.makedirs(output_dir, exist_ok=True)
        
        # PPTXをPDFに変換
        pptx_name = os.path.splitext(os.path.basename(pptx_path))[0]
        pdf_path = os.path.join(output_dir, f"{pptx_name}.pdf")
        
        print(f"Converting PPTX to PDF: output={pdf_path}", file=sys.stderr)
        
        if sys.platform == "darwin":  # macOS
            # LibreOfficeのパスを確認
            libreoffice_path = subprocess.run(["which", "soffice"], capture_output=True, text=True).stdout.strip()
            print(f"LibreOffice path: {libreoffice_path}", file=sys.stderr)
            
            result = subprocess.run(
                [libreoffice_path, "--headless", "--convert-to", "pdf", "--outdir", output_dir, pptx_path],
                capture_output=True,
                text=True
            )
            
            print(f"LibreOffice conversion result: returncode={result.returncode}", file=sys.stderr)
            print(f"LibreOffice stdout: {result.stdout}", file=sys.stderr)
            print(f"LibreOffice stderr: {result.stderr}", file=sys.stderr)
            
            if result.returncode != 0:
                print(f"LibreOffice conversion failed with code {result.returncode}", file=sys.stderr)
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
            print(f"PDF file not found at {pdf_path}", file=sys.stderr)
            return [], (0, 0)
            
        print(f"PDF file created successfully: {pdf_path}", file=sys.stderr)
            
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
                
                # パスの存在確認
                print(f"Checking poppler path: {poppler_path}", file=sys.stderr)
                if os.path.exists(os.path.join(poppler_path, "pdftoppm")):
                    print(f"pdftoppm found at {os.path.join(poppler_path, 'pdftoppm')}", file=sys.stderr)
                else:
                    print(f"pdftoppm NOT found at {os.path.join(poppler_path, 'pdftoppm')}", file=sys.stderr)
                    # 環境変数PATHからpoppler関連コマンドを探す
                    for path_dir in os.environ.get('PATH', '').split(':'):
                        if os.path.exists(os.path.join(path_dir, 'pdftoppm')):
                            poppler_path = path_dir
                            print(f"Found pdftoppm in PATH: {os.path.join(path_dir, 'pdftoppm')}", file=sys.stderr)
                            break
            
            print(f"Using poppler_path: {poppler_path}", file=sys.stderr)
            print(f"Converting PDF to images with size: {target_width}x{target_height}", file=sys.stderr)
            
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
            
            print(f"Converted {len(images)} images from PDF", file=sys.stderr)
            
            if not images:
                print("No images were converted from PDF", file=sys.stderr)
                return [], (0, 0)
                
            # 実際の画像サイズを取得
            actual_width = images[0].width
            actual_height = images[0].height
            print(f"Actual image size: {actual_width}x{actual_height}", file=sys.stderr)
            
        except Exception as e:
            print(f"Error converting PDF to images: {str(e)}", file=sys.stderr)
            return [], (0, 0)
        
        image_paths = []
        for i, image in enumerate(images):
            image_path = os.path.join(output_dir, f"slide_{i+1}.png")
            # 高品質で保存
            try:
                # 保存前にディレクトリが存在することを確認
                os.makedirs(os.path.dirname(image_path), exist_ok=True)
                
                # 高品質で保存
                image.save(image_path, "PNG", quality=95, optimize=True)
                
                # 保存後にファイルが存在することを確認
                if os.path.exists(image_path):
                    print(f"Successfully saved image: {image_path}", file=sys.stderr)
                else:
                    print(f"Warning: Image file not found after save: {image_path}", file=sys.stderr)
                
                rel_path = f"slide_{i+1}.png"
                image_paths.append(rel_path)
            except Exception as e:
                print(f"Error saving image {i+1}: {str(e)}", file=sys.stderr)
        
        try:
            os.remove(pdf_path)
        except Exception:
            pass
        
        print(f"Returning {len(image_paths)} image paths", file=sys.stderr)
        return image_paths, (actual_width, actual_height)
        
    except Exception as e:
        print(f"Exception in convert_to_png: {str(e)}", file=sys.stderr)
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
    # デバッグ出力
    print(f"Converting coordinates: ({x}, {y}, {width}, {height}) in slide size {slide_width}x{slide_height} to image size {image_width}x{image_height}", file=sys.stderr)
    
    # スライドと画像のアスペクト比を計算
    slide_aspect = slide_width / slide_height
    image_aspect = image_width / image_height
    
    # 基本のスケーリング係数を計算
    scale_x = image_width / slide_width
    scale_y = image_height / slide_height
    
    # アスペクト比の違いを考慮したスケーリング
    if abs(slide_aspect - image_aspect) > 0.01:  # アスペクト比が異なる場合
        print(f"Aspect ratio adjustment needed: slide={slide_aspect}, image={image_aspect}", file=sys.stderr)
        
        # 画像がスライドより横長の場合
        if image_aspect > slide_aspect:
            # 高さに合わせてスケーリング
            new_width = image_height * slide_aspect
            # 中央揃えのためのオフセット計算
            offset_x = (image_width - new_width) / 2
            # スケール係数を調整
            scale_x = new_width / slide_width
            # 座標を変換
            scaled_x = x * scale_x + offset_x
            scaled_y = y * scale_y
        else:
            # 幅に合わせてスケーリング
            new_height = image_width / slide_aspect
            # 中央揃えのためのオフセット計算
            offset_y = (image_height - new_height) / 2
            # スケール係数を調整
            scale_y = new_height / slide_height
            # 座標を変換
            scaled_x = x * scale_x
            scaled_y = y * scale_y + offset_y
    else:
        # アスペクト比が同じ場合は単純にスケーリング
        scaled_x = x * scale_x
        scaled_y = y * scale_y
    
    # サイズをスケーリング
    scaled_width = width * scale_x
    scaled_height = height * scale_y
    
    # デバッグ出力
    print(f"Scaled coordinates: ({scaled_x}, {scaled_y}, {scaled_width}, {scaled_height})", file=sys.stderr)
    
    # 結果を返す
    result = {
        "x": round(scaled_x),
        "y": round(scaled_y),
        "width": round(scaled_width),
        "height": round(scaled_height)
    }
    
    print(f"Final coordinates: {result}", file=sys.stderr)
    return result

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
        print(f"Starting parse_pptx: file_path={file_path}, output_dir={output_dir}", file=sys.stderr)
        prs = Presentation(file_path)
        slides = []
        
        print(f"Successfully loaded presentation with {len(prs.slides)} slides", file=sys.stderr)
        
        # スライドを画像に変換
        image_paths, (image_width, image_height) = convert_to_png(file_path, output_dir)
        
        if not image_paths:
            print("No image paths returned from convert_to_png", file=sys.stderr)
            return []
            
        print(f"Got {len(image_paths)} image paths, image size: {image_width}x{image_height}", file=sys.stderr)
            
        for slide_index, slide in enumerate(prs.slides):
            texts = []
            
            # スライドのサイズを取得
            slide_width = prs.slide_width
            slide_height = prs.slide_height
            
            print(f"Processing slide {slide_index+1}/{len(prs.slides)}, size: {slide_width}x{slide_height}", file=sys.stderr)
            
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
            
            print(f"Extracted {len(texts)} text elements from slide {slide_index+1}", file=sys.stderr)
            
            slides.append({
                "index": slide_index,
                "texts": texts,
                "image_path": image_paths[slide_index] if slide_index < len(image_paths) else None
            })
        
        print(f"Processed {len(slides)} slides in total", file=sys.stderr)
        
        # 最終結果を構築
        result_structure = {
            "slides": slides
        }
        
        # 結果を標準出力に出力（これだけがstdoutに出力される）
        print(json.dumps(result_structure))
        return slides
        
    except Exception as e:
        # エラー時も適切なJSONを返す
        print(f"Error in parse_pptx: {str(e)}", file=sys.stderr)
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
        print(f"Usage: {sys.argv[0]} <pptx_file> <output_dir>", file=sys.stderr)
        sys.exit(1)
    
    pptx_file = sys.argv[1]
    output_dir = sys.argv[2]
    
    print(f"Starting PPTX parser with file={pptx_file}, output_dir={output_dir}", file=sys.stderr)
    
    try:
        # PPTXファイルを解析
        print(f"Calling parse_pptx...", file=sys.stderr)
        slides = parse_pptx(pptx_file, output_dir)
        
        # 処理結果をチェック
        if not slides:
            print("No slides returned from parse_pptx", file=sys.stderr)
            sys.exit(1)
        
        print(f"Successfully processed {len(slides)} slides", file=sys.stderr)
        
        # 正常終了
        sys.exit(0)
    except Exception as e:
        # エラー終了
        print(f"Error in main: {str(e)}", file=sys.stderr)
        sys.exit(1)
