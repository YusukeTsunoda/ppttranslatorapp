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

def extract_metadata(presentation: Presentation) -> dict:
    """
    プレゼンテーションのメタデータを抽出する
    
    Args:
        presentation (Presentation): PowerPointプレゼンテーション
    
    Returns:
        dict: メタデータ情報
    """
    core_props = presentation.core_properties
    
    metadata = {
        'title': core_props.title or '',
        'author': core_props.author or '',
        'created': core_props.created.isoformat() if core_props.created else '',
        'modified': core_props.modified.isoformat() if core_props.modified else '',
        'company': core_props.company or '',
        'version': core_props.version or '',
        'lastModifiedBy': core_props.last_modified_by or '',
        'revision': core_props.revision or 0,
        'subject': core_props.subject or '',
        'keywords': core_props.keywords.split(',') if core_props.keywords else [],
        'category': core_props.category or '',
        'description': core_props.description or '',
        'language': core_props.language or 'ja-JP',
        'presentationFormat': 'widescreen' if presentation.slide_width > 9144000 else 'standard',
        'createdApplication': core_props.application or ''
    }
    
    return metadata

def extract_font_info(run) -> dict:
    """
    テキストのフォント情報を抽出する
    
    Args:
        run: テキストラン
    
    Returns:
        dict: フォント情報
    """
    font = run.font
    return {
        'name': font.name or 'Arial',
        'size': font.size.pt if font.size else 12,
        'color': f'#{font.color.rgb:06x}' if font.color and font.color.type == 'RGB' else '#000000',
        'bold': bool(font.bold),
        'italic': bool(font.italic),
        'underline': bool(font.underline),
        'strikethrough': bool(font.strike),
        'superscript': bool(font.superscript),
        'subscript': bool(font.subscript),
        'characterSpacing': font.char_spacing or 0,
        'kerning': bool(font.kerning)
    }

def extract_text_style(paragraph) -> dict:
    """
    段落のスタイル情報を抽出する
    
    Args:
        paragraph: 段落オブジェクト
    
    Returns:
        dict: スタイル情報
    """
    alignment_map = {
        0: 'left',
        1: 'center',
        2: 'right',
        3: 'justify'
    }
    
    return {
        'alignment': alignment_map.get(paragraph.alignment, 'left'),
        'lineSpacing': paragraph.line_spacing or 1.0,
        'indentation': paragraph.indent or 0,
        'direction': 'rtl' if paragraph.rtl else 'ltr',
        'bulletStyle': extract_bullet_style(paragraph)
    }

def extract_bullet_style(paragraph) -> dict:
    """
    箇条書きのスタイル情報を抽出する
    
    Args:
        paragraph: 段落オブジェクト
    
    Returns:
        dict: 箇条書きスタイル情報
    """
    if not paragraph.bullet:
        return None
        
    return {
        'type': 'number' if paragraph.bullet.numbered else 'bullet',
        'format': paragraph.bullet.format if hasattr(paragraph.bullet, 'format') else None,
        'startAt': paragraph.bullet.start_num if hasattr(paragraph.bullet, 'start_num') else None
    }

def extract_shape_info(shape) -> dict:
    """
    シェイプの情報を抽出する
    
    Args:
        shape: シェイプオブジェクト
    
    Returns:
        dict: シェイプ情報
    """
    shape_type = shape.shape_type
    
    base_info = {
        'type': str(shape_type),
        'x': shape.left,
        'y': shape.top,
        'width': shape.width,
        'height': shape.height,
        'rotation': shape.rotation,
        'fillColor': extract_fill_color(shape),
        'strokeColor': extract_line_color(shape),
        'strokeWidth': shape.line.width if shape.line else 1,
        'opacity': shape.fill.transparency if shape.fill else 1
    }
    
    # 円の場合は半径を追加
    if shape_type == 'OVAL':
        base_info['radius'] = min(shape.width, shape.height) / 2
        
    # 多角形の場合は頂点情報を追加
    if hasattr(shape, 'points'):
        base_info['points'] = [{'x': point[0], 'y': point[1]} for point in shape.points]
        
    return base_info

def extract_fill_color(shape) -> str:
    """
    シェイプの塗りつぶし色を抽出する
    
    Args:
        shape: シェイプオブジェクト
    
    Returns:
        str: 色情報（16進数）
    """
    if not shape.fill or shape.fill.type == 'NONE':
        return 'transparent'
        
    if shape.fill.type == 'SOLID':
        return f'#{shape.fill.fore_color.rgb:06x}' if shape.fill.fore_color else '#000000'
        
    return 'transparent'

def extract_line_color(shape) -> str:
    """
    シェイプの線の色を抽出する
    
    Args:
        shape: シェイプオブジェクト
    
    Returns:
        str: 色情報（16進数）
    """
    if not shape.line or shape.line.fill.type == 'NONE':
        return 'transparent'
        
    return f'#{shape.line.color.rgb:06x}' if shape.line.color else '#000000'

def extract_background(slide) -> dict:
    """
    スライドの背景情報を抽出する
    
    Args:
        slide: スライドオブジェクト
    
    Returns:
        dict: 背景情報
    """
    background = slide.background
    
    if not background:
        return {
            'color': '#FFFFFF',
            'image': None,
            'pattern': None,
            'gradient': None,
            'transparency': 0
        }
        
    fill = background.fill
    result = {
        'color': '#FFFFFF',
        'image': None,
        'pattern': None,
        'gradient': None,
        'transparency': fill.transparency if fill else 0
    }
    
    if fill:
        if fill.type == 'SOLID':
            result['color'] = f'#{fill.fore_color.rgb:06x}' if fill.fore_color else '#FFFFFF'
        elif fill.type == 'PICTURE':
            result['image'] = {
                'rId': fill.image.rId,
                'filename': fill.image.filename
            }
        elif fill.type == 'PATTERN':
            result['pattern'] = {
                'type': str(fill.pattern),
                'foreColor': f'#{fill.fore_color.rgb:06x}' if fill.fore_color else '#000000',
                'backColor': f'#{fill.back_color.rgb:06x}' if fill.back_color else '#FFFFFF'
            }
        elif fill.type == 'GRADIENT':
            result['gradient'] = {
                'type': 'linear' if fill.gradient_stops else 'radial',
                'stops': [
                    {
                        'position': stop.position,
                        'color': f'#{stop.color.rgb:06x}'
                    }
                    for stop in fill.gradient_stops
                ],
                'angle': fill.gradient_angle if hasattr(fill, 'gradient_angle') else 0
            }
            
    return result

def parse_pptx(file_path: str, output_dir: str) -> dict:
    """
    PPTXファイルを解析する
    
    Args:
        file_path (str): PPTXファイルのパス
        output_dir (str): 出力ディレクトリ
    
    Returns:
        dict: 解析結果
    """
    try:
        presentation = Presentation(file_path)
        image_paths, image_size = convert_to_png(file_path, output_dir)
        
        if not image_paths:
            return {'error': 'Failed to convert slides to images'}
            
        metadata = extract_metadata(presentation)
        slides_data = []
        
        for i, (slide, image_path) in enumerate(zip(presentation.slides, image_paths)):
            slide_data = {
                'index': i,
                'image_path': image_path,
                'texts': [],
                'shapes': [],
                'background': extract_background(slide)
            }
            
            for shape in slide.shapes:
                if hasattr(shape, 'text') and shape.text.strip():
                    text_data = extract_text_from_shape(shape)
                    if text_data:
                        slide_data['texts'].extend(text_data)
                        
                shape_info = extract_shape_info(shape)
                if shape_info:
                    slide_data['shapes'].append(shape_info)
                    
            slides_data.append(slide_data)
            
        return {
            'metadata': metadata,
            'slides': slides_data
        }
        
    except Exception as e:
        print(f"Error parsing PPTX: {str(e)}", file=sys.stderr)
        return {'error': str(e)}

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
