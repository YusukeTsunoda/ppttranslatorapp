#!/usr/bin/env python3
import sys
import json
from pptx import Presentation
from typing import Dict, List

def update_pptx_with_translations(
    original_file: str,
    translations_file: str,
    output_file: str
) -> Dict:
    """
    翻訳されたテキストでPPTXファイルを更新する
    
    Args:
        original_file (str): 元のPPTXファイルパス
        translations_file (str): 翻訳データのJSONファイルパス
        output_file (str): 出力するPPTXファイルパス
    
    Returns:
        Dict: 処理結果
    """
    try:
        print("\n=== Starting PPTX translation process ===", file=sys.stderr)
        print(f"Original file: {original_file}", file=sys.stderr)
        print(f"Translations file: {translations_file}", file=sys.stderr)
        print(f"Output file: {output_file}\n", file=sys.stderr)

        # 翻訳データを読み込む
        with open(translations_file, 'r', encoding='utf-8') as f:
            try:
                translations_data = json.load(f)
                print("=== Loaded translations data ===", file=sys.stderr)
                print(f"Number of slides: {len(translations_data)}", file=sys.stderr)
                print("First slide sample:", file=sys.stderr)
                if translations_data:
                    print(json.dumps(translations_data[0], indent=2), file=sys.stderr)
                print("\n", file=sys.stderr)
            except json.JSONDecodeError as e:
                print(f"Failed to parse translations JSON: {str(e)}", file=sys.stderr)
                return {"success": False, "error": f"Invalid JSON format: {str(e)}"}

        # プレゼンテーションを開く
        try:
            prs = Presentation(original_file)
            print(f"Successfully opened presentation with {len(prs.slides)} slides", file=sys.stderr)
        except Exception as e:
            print(f"Failed to open presentation: {str(e)}", file=sys.stderr)
            return {"success": False, "error": f"Failed to open presentation: {str(e)}"}
        
        # スライドインデックスでソート
        translations_data.sort(key=lambda x: x['index'])
        
        # 各スライドの翻訳を適用
        for slide_data in translations_data:
            try:
                slide_index = slide_data['index']
                if slide_index >= len(prs.slides):
                    print(f"Skip slide {slide_index}: Index out of range", file=sys.stderr)
                    continue
                    
                slide = prs.slides[slide_index]
                texts = slide_data.get('texts', [])
                
                print(f"\n=== Processing slide {slide_index} ===", file=sys.stderr)
                print(f"Number of text elements in data: {len(texts)}", file=sys.stderr)
                
                # スライド内のすべてのシェイプを取得
                shapes = [shape for shape in slide.shapes if hasattr(shape, "text")]
                print(f"Number of text shapes in slide: {len(shapes)}", file=sys.stderr)
                
                # テキストの内容でシェイプを対応付け
                for text_data in texts:
                    original = text_data.get('text', '').strip()
                    translation = text_data.get('translation')
                    
                    # 対応するシェイプを探す
                    matching_shape = None
                    for shape in shapes:
                        if shape.text.strip() == original:
                            matching_shape = shape
                            break
                    
                    if matching_shape:
                        print(f"\nFound matching shape for text:", file=sys.stderr)
                        print(f"  Original text: '{original}'", file=sys.stderr)
                        print(f"  Current shape text: '{matching_shape.text.strip()}'", file=sys.stderr)
                        print(f"  Translation: '{translation}'", file=sys.stderr)
                        
                        # 翻訳テキストが存在する場合は更新
                        if translation is not None:
                            matching_shape.text = translation
                            print(f"  ✓ Updated to: '{translation}'", file=sys.stderr)
                        else:
                            print(f"  ✗ Skipped: No translation available", file=sys.stderr)
                    else:
                        print(f"\nNo matching shape found for text: '{original}'", file=sys.stderr)
                        
            except Exception as e:
                print(f"Error processing slide {slide_index}: {str(e)}", file=sys.stderr)
                continue
        
        # 変更を保存
        try:
            print("\n=== Saving presentation ===", file=sys.stderr)
            prs.save(output_file)
            print("✓ Presentation saved successfully", file=sys.stderr)
            return {"success": True}
        except Exception as e:
            print(f"✗ Failed to save presentation: {str(e)}", file=sys.stderr)
            return {"success": False, "error": f"Failed to save presentation: {str(e)}"}
        
    except Exception as e:
        print(f"✗ Error in update_pptx_with_translations: {str(e)}", file=sys.stderr)
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({
            "success": False,
            "error": "Usage: python pptx_generator.py <original_pptx> <translations_json> <output_pptx>"
        }))
        sys.exit(1)
    
    original_file = sys.argv[1]
    translations_file = sys.argv[2]
    output_file = sys.argv[3]
    
    result = update_pptx_with_translations(original_file, translations_file, output_file)
    print(json.dumps(result))