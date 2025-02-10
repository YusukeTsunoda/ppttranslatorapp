#!/usr/bin/env python3
import sys
import json
from pptx import Presentation
from typing import List, Dict, Any

def extract_text_from_shape(shape):
    if hasattr(shape, "text"):
        return shape.text.strip()
    return ""

def parse_pptx(file_path):
    prs = Presentation(file_path)
    slides = []
    
    for slide_index, slide in enumerate(prs.slides):
        texts = []
        for shape in slide.shapes:
            text = extract_text_from_shape(shape)
            if text:
                texts.append({
                    "text": text,
                    "type": "text",
                    "position": {
                        "x": shape.left,
                        "y": shape.top,
                        "width": shape.width,
                        "height": shape.height
                    }
                })
        
        slides.append({
            "index": slide_index,
            "texts": texts
        })
    
    return slides

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
    if len(sys.argv) != 2:
        print(json.dumps({"error": "ファイルパスが必要です"}))
        sys.exit(1)
    
    try:
        file_path = sys.argv[1]
        slides = parse_pptx(file_path)
        print(json.dumps({"slides": slides}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
