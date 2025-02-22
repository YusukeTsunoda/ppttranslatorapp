#!/usr/bin/env python3
import sys
import json
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

def find_matching_shape(shape, original_text):
    """シェイプのテキストが元のテキストと一致するか確認"""
    if not hasattr(shape, 'text_frame'):
        return False
    return shape.text_frame.text.strip() == original_text.strip()

def update_slide_text(slide, slide_data):
    """スライド内のテキストを翻訳文で更新する"""
    if not slide_data.get('texts'):
        return

    for text_data in slide_data['texts']:
        original_text = text_data.get('text', '').strip()
        translation = text_data.get('translation', '')

        # 翻訳が存在しない場合はスキップ
        if not translation:
            continue

        # スライド内の全シェイプを検索
        for shape in slide.shapes:
            if find_matching_shape(shape, original_text):
                shape.text_frame.text = translation
                break

def main():
    if len(sys.argv) != 4:
        print(json.dumps({
            "error": "Usage: python pptx_translator.py input_file output_file slides_data"
        }))
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    slides_data = json.loads(sys.argv[3])

    try:
        # デバッグ情報を出力
        print(f"Loading presentation from: {input_file}", file=sys.stderr)
        
        # 元のプレゼンテーションを読み込む
        prs = Presentation(input_file)
        print(f"Loaded presentation with {len(prs.slides)} slides", file=sys.stderr)

        # 各スライドの翻訳を適用
        for slide_data in slides_data:
            slide_index = slide_data.get('index', 0)
            if slide_index < len(prs.slides):
                print(f"\nProcessing slide {slide_index}", file=sys.stderr)
                update_slide_text(prs.slides[slide_index], slide_data)

        # 翻訳済みプレゼンテーションを保存
        print(f"\nSaving presentation to: {output_file}", file=sys.stderr)
        prs.save(output_file)
        print(json.dumps({"success": True}))

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main() 