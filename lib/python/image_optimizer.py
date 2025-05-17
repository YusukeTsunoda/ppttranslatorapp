#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
画像処理の最適化モジュール
スライド画像のサイズ最適化、形式変換、圧縮などを行う
"""

import os
import sys
import io
from typing import Tuple, Optional, Dict, Any, List
from PIL import Image, ImageOps
import logging

# ロギング設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('image_optimizer')

# 画像形式の設定
SUPPORTED_FORMATS = {
    'PNG': {'extension': '.png', 'mime': 'image/png'},
    'WEBP': {'extension': '.webp', 'mime': 'image/webp'},
    'JPEG': {'extension': '.jpg', 'mime': 'image/jpeg'}
}

# デフォルト設定
DEFAULT_QUALITY = 85
DEFAULT_FORMAT = 'PNG'
DEFAULT_MAX_WIDTH = 1920
DEFAULT_MAX_HEIGHT = 1080
DEFAULT_OPTIMIZE = True

def resize_image(image: Image.Image, max_width: int = DEFAULT_MAX_WIDTH, 
                max_height: int = DEFAULT_MAX_HEIGHT) -> Image.Image:
    """
    画像をリサイズする（アスペクト比を維持）
    
    Args:
        image: 元の画像
        max_width: 最大幅
        max_height: 最大高さ
        
    Returns:
        リサイズされた画像
    """
    if image.width <= max_width and image.height <= max_height:
        return image  # リサイズ不要
    
    # アスペクト比を維持してリサイズ
    width_ratio = max_width / image.width
    height_ratio = max_height / image.height
    ratio = min(width_ratio, height_ratio)
    
    new_width = int(image.width * ratio)
    new_height = int(image.height * ratio)
    
    logger.info(f"Resizing image from {image.width}x{image.height} to {new_width}x{new_height}")
    return image.resize((new_width, new_height), Image.LANCZOS)

def convert_format(image: Image.Image, format: str = DEFAULT_FORMAT, 
                  quality: int = DEFAULT_QUALITY) -> Tuple[bytes, str, str]:
    """
    画像を指定された形式に変換する
    
    Args:
        image: 元の画像
        format: 変換先フォーマット ('PNG', 'WEBP', 'JPEG')
        quality: 画質 (0-100)
        
    Returns:
        (画像バイナリ, 拡張子, MIMEタイプ)
    """
    if format not in SUPPORTED_FORMATS:
        format = DEFAULT_FORMAT
    
    # 形式ごとの最適化パラメータ
    format_params = {}
    if format == 'PNG':
        format_params = {
            'optimize': DEFAULT_OPTIMIZE,
            'compress_level': 9 if quality > 90 else 6
        }
    elif format == 'WEBP':
        format_params = {
            'quality': quality,
            'method': 6,  # 圧縮レベル (0-6)
            'lossless': quality > 95
        }
    elif format == 'JPEG':
        format_params = {
            'quality': quality,
            'optimize': DEFAULT_OPTIMIZE,
            'progressive': True
        }
    
    # 画像をバイトストリームに変換
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format=format, **format_params)
    
    # 拡張子とMIMEタイプを取得
    extension = SUPPORTED_FORMATS[format]['extension']
    mime_type = SUPPORTED_FORMATS[format]['mime']
    
    return img_byte_arr.getvalue(), extension, mime_type

def optimize_image(input_path: str, output_path: Optional[str] = None, 
                  format: str = DEFAULT_FORMAT, quality: int = DEFAULT_QUALITY,
                  max_width: int = DEFAULT_MAX_WIDTH, 
                  max_height: int = DEFAULT_MAX_HEIGHT) -> Dict[str, Any]:
    """
    画像を最適化する
    
    Args:
        input_path: 入力画像のパス
        output_path: 出力画像のパス (Noneの場合は入力パスを上書き)
        format: 出力形式 ('PNG', 'WEBP', 'JPEG')
        quality: 画質 (0-100)
        max_width: 最大幅
        max_height: 最大高さ
        
    Returns:
        最適化結果の情報
    """
    try:
        # 出力パスが指定されていない場合は入力パスを使用
        if output_path is None:
            output_dir = os.path.dirname(input_path)
            filename = os.path.splitext(os.path.basename(input_path))[0]
            extension = SUPPORTED_FORMATS[format]['extension']
            output_path = os.path.join(output_dir, f"{filename}{extension}")
        
        # 画像を開く
        with Image.open(input_path) as img:
            original_size = os.path.getsize(input_path)
            original_dimensions = (img.width, img.height)
            
            # 画像の最適化
            img = resize_image(img, max_width, max_height)
            
            # 出力ディレクトリが存在することを確認
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # 画像を保存
            img_data, extension, mime_type = convert_format(img, format, quality)
            
            with open(output_path, 'wb') as f:
                f.write(img_data)
            
            # 結果情報
            new_size = os.path.getsize(output_path)
            compression_ratio = (original_size - new_size) / original_size * 100 if original_size > 0 else 0
            
            result = {
                'path': output_path,
                'format': format,
                'mime_type': mime_type,
                'dimensions': {
                    'width': img.width,
                    'height': img.height
                },
                'original': {
                    'size': original_size,
                    'dimensions': original_dimensions
                },
                'optimized': {
                    'size': new_size,
                    'compression_ratio': compression_ratio
                }
            }
            
            logger.info(f"Image optimized: {input_path} -> {output_path}")
            logger.info(f"Size reduction: {original_size} -> {new_size} bytes ({compression_ratio:.2f}% saved)")
            
            return result
            
    except Exception as e:
        logger.error(f"Error optimizing image {input_path}: {str(e)}")
        raise
        
def batch_optimize(input_paths: List[str], output_dir: str, 
                  format: str = DEFAULT_FORMAT, quality: int = DEFAULT_QUALITY,
                  max_width: int = DEFAULT_MAX_WIDTH, 
                  max_height: int = DEFAULT_MAX_HEIGHT) -> List[Dict[str, Any]]:
    """
    複数の画像を一括で最適化する
    
    Args:
        input_paths: 入力画像のパスリスト
        output_dir: 出力ディレクトリ
        format: 出力形式
        quality: 画質
        max_width: 最大幅
        max_height: 最大高さ
        
    Returns:
        最適化結果の情報リスト
    """
    results = []
    
    for input_path in input_paths:
        try:
            filename = os.path.splitext(os.path.basename(input_path))[0]
            extension = SUPPORTED_FORMATS[format]['extension']
            output_path = os.path.join(output_dir, f"{filename}{extension}")
            
            result = optimize_image(
                input_path=input_path,
                output_path=output_path,
                format=format,
                quality=quality,
                max_width=max_width,
                max_height=max_height
            )
            
            results.append(result)
            
        except Exception as e:
            logger.error(f"Error processing {input_path}: {str(e)}")
            results.append({
                'path': input_path,
                'error': str(e)
            })
    
    return results

def get_optimal_format(use_case: str = 'default') -> str:
    """
    ユースケースに基づいて最適な画像形式を取得する
    
    Args:
        use_case: ユースケース ('default', 'thumbnail', 'high_quality')
        
    Returns:
        推奨フォーマット
    """
    if use_case == 'thumbnail':
        return 'WEBP'  # サムネイルにはWebPが最適
    elif use_case == 'high_quality':
        return 'PNG'   # 高品質にはPNGが最適
    else:
        return 'WEBP'  # デフォルトはWebP

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='画像最適化ツール')
    parser.add_argument('input', help='入力画像パスまたはディレクトリ')
    parser.add_argument('--output', '-o', help='出力パスまたはディレクトリ')
    parser.add_argument('--format', '-f', choices=['PNG', 'WEBP', 'JPEG'], default=DEFAULT_FORMAT,
                        help='出力形式')
    parser.add_argument('--quality', '-q', type=int, default=DEFAULT_QUALITY,
                        help='画質 (0-100)')
    parser.add_argument('--max-width', type=int, default=DEFAULT_MAX_WIDTH,
                        help='最大幅')
    parser.add_argument('--max-height', type=int, default=DEFAULT_MAX_HEIGHT,
                        help='最大高さ')
    parser.add_argument('--batch', '-b', action='store_true',
                        help='ディレクトリ内のすべての画像を処理')
    
    args = parser.parse_args()
    
    try:
        if args.batch or os.path.isdir(args.input):
            # ディレクトリ内のすべての画像を処理
            if not os.path.isdir(args.input):
                logger.error(f"Input path is not a directory: {args.input}")
                sys.exit(1)
                
            output_dir = args.output if args.output else args.input
            
            # 画像ファイルを検索
            image_files = []
            for root, _, files in os.walk(args.input):
                for file in files:
                    if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                        image_files.append(os.path.join(root, file))
            
            results = batch_optimize(
                input_paths=image_files,
                output_dir=output_dir,
                format=args.format,
                quality=args.quality,
                max_width=args.max_width,
                max_height=args.max_height
            )
            
            # 結果サマリーを表示
            total_original = sum(r.get('original', {}).get('size', 0) for r in results if 'original' in r)
            total_optimized = sum(r.get('optimized', {}).get('size', 0) for r in results if 'optimized' in r)
            total_saved = total_original - total_optimized
            
            if total_original > 0:
                logger.info(f"Batch optimization complete: {len(results)} images processed")
                logger.info(f"Total size reduction: {total_original} -> {total_optimized} bytes")
                logger.info(f"Total saved: {total_saved} bytes ({total_saved/total_original*100:.2f}%)")
            
        else:
            # 単一画像の処理
            result = optimize_image(
                input_path=args.input,
                output_path=args.output,
                format=args.format,
                quality=args.quality,
                max_width=args.max_width,
                max_height=args.max_height
            )
            
            logger.info(f"Optimization complete: {result['path']}")
            logger.info(f"Format: {result['format']}")
            logger.info(f"Dimensions: {result['dimensions']['width']}x{result['dimensions']['height']}")
            logger.info(f"Size: {result['original']['size']} -> {result['optimized']['size']} bytes")
            logger.info(f"Compression ratio: {result['optimized']['compression_ratio']:.2f}%")
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        sys.exit(1)
