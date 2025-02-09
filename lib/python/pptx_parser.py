from pptx import Presentation
from typing import List, Dict, Any
import json

def extract_text_from_pptx(file_path: str) -> List[Dict[str, Any]]:
    """
    PPTXファイルからテキストを抽出し、スライドごとの情報を返す
    
    Args:
        file_path (str): PPTXファイルのパス
    
    Returns:
        List[Dict[str, Any]]: スライドごとのテキスト情報
    """
    prs = Presentation(file_path)
    slides_data = []
    
    for slide_index, slide in enumerate(prs.slides):
        slide_texts = []
        
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                # シェイプの位置情報と共にテキストを保存
                text_data = {
                    "text": shape.text.strip(),
                    "shape_id": shape.shape_id,
                    "position": {
                        "left": shape.left,
                        "top": shape.top,
                        "width": shape.width,
                        "height": shape.height
                    },
                    "type": shape.shape_type
                }
                slide_texts.append(text_data)
        
        # スライドの情報をまとめる
        slide_info = {
            "slide_index": slide_index,
            "texts": slide_texts,
            "layout_name": slide.slide_layout.name
        }
        slides_data.append(slide_info)
    
    return slides_data

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
    # テスト用コード
    import sys
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        slides_data = extract_text_from_pptx(file_path)
        print(json.dumps(slides_data, ensure_ascii=False, indent=2))
