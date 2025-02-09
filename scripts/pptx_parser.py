from pptx import Presentation
import json
import sys
import uuid
from typing import Dict, List, Optional

def extract_text_style(run) -> Dict:
    """テキストのスタイル情報を抽出"""
    return {
        "fontSize": run.font.size.pt if hasattr(run.font, "size") and run.font.size else None,
        "fontFamily": run.font.name if hasattr(run.font, "name") else None,
        "bold": run.font.bold if hasattr(run.font, "bold") else None,
        "italic": run.font.italic if hasattr(run.font, "italic") else None,
    }

def extract_position(shape) -> Dict:
    """シェイプの位置情報を抽出"""
    return {
        "x": shape.left,
        "y": shape.top,
        "width": shape.width,
        "height": shape.height
    }

def extract_slide_content(slide) -> Dict:
    """スライドの内容を抽出"""
    texts = []
    layout_elements = []

    for shape in slide.shapes:
        if hasattr(shape, "text") and shape.text.strip():
            # テキスト要素の抽出
            text_element = {
                "id": str(uuid.uuid4()),
                "content": shape.text.strip(),
                "position": extract_position(shape),
                "style": extract_text_style(shape.text_frame.paragraphs[0].runs[0]) if shape.text_frame.paragraphs and shape.text_frame.paragraphs[0].runs else {}
            }
            texts.append(text_element)

        # レイアウト要素の抽出
        layout_element = {
            "type": shape.shape_type,
            "position": extract_position(shape),
        }
        if hasattr(shape, "placeholder_format"):
            layout_element["placeholder"] = shape.placeholder_format.type
        layout_elements.append(layout_element)

    return {
        "texts": texts,
        "layout": {
            "masterLayout": slide.slide_layout.name,
            "elements": layout_elements
        }
    }

def extract_metadata(presentation) -> Dict:
    """プレゼンテーションのメタデータを抽出"""
    core_properties = presentation.core_properties
    return {
        "totalSlides": len(presentation.slides),
        "title": core_properties.title if hasattr(core_properties, "title") else None,
        "author": core_properties.author if hasattr(core_properties, "author") else None,
        "lastModified": core_properties.modified.isoformat() if hasattr(core_properties, "modified") and core_properties.modified else None
    }

def main(pptx_path: str):
    """メイン処理"""
    try:
        prs = Presentation(pptx_path)
        slides = []
        
        for idx, slide in enumerate(prs.slides):
            content = extract_slide_content(slide)
            slide_data = {
                "id": str(uuid.uuid4()),
                "index": idx,
                **content
            }
            slides.append(slide_data)
        
        result = {
            "success": True,
            "data": {
                "slides": slides,
                "metadata": extract_metadata(prs)
            }
        }
        
        print(json.dumps(result))
        sys.exit(0)
    
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "PPTXファイルのパスを指定してください"
        }))
        sys.exit(1)
    
    main(sys.argv[1])
