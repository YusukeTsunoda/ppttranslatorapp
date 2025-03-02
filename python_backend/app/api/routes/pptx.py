from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
import os
import uuid
import shutil
from typing import List, Dict, Any, Optional
import logging

from app.services.pptx_parser import PPTXParser

router = APIRouter()
logger = logging.getLogger(__name__)

# 一時ディレクトリのパス
TEMP_DIR = "/app/tmp"

@router.post("/parse", summary="PPTXファイルを解析")
async def parse_pptx(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    アップロードされたPPTXファイルを解析し、スライドの内容とプレビュー画像を返す
    """
    # ファイルタイプの検証
    if not file.content_type == "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        raise HTTPException(status_code=400, detail="PPTXファイルのみアップロード可能です")
    
    # 一時ディレクトリの作成
    file_id = str(uuid.uuid4())
    user_dir = os.path.join(TEMP_DIR, file_id)
    os.makedirs(user_dir, exist_ok=True)
    
    # ファイルの保存
    file_path = os.path.join(user_dir, "original.pptx")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # PPTXファイルの解析
        slides = PPTXParser.parse_pptx(file_path, user_dir)
        
        # 結果の整形
        result = {
            "file_id": file_id,
            "slides": slides
        }
        
        # 一時ファイルの削除をバックグラウンドタスクに登録（オプション）
        if background_tasks:
            background_tasks.add_task(cleanup_temp_files, file_path)
        
        return result
    
    except Exception as e:
        logger.error(f"Error parsing PPTX: {str(e)}")
        # エラー時は一時ディレクトリを削除
        shutil.rmtree(user_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"PPTXファイルの解析に失敗しました: {str(e)}")

@router.post("/generate", summary="翻訳済みPPTXファイルを生成")
async def generate_pptx(
    file_id: str = Form(...),
    translations: str = Form(...)
):
    """
    翻訳されたテキストを元のPPTXファイルに適用し、新しいPPTXファイルを生成
    """
    try:
        # ファイルIDの検証
        user_dir = os.path.join(TEMP_DIR, file_id)
        original_file = os.path.join(user_dir, "original.pptx")
        
        if not os.path.exists(original_file):
            raise HTTPException(status_code=404, detail="指定されたファイルが見つかりません")
        
        # 翻訳データのパース
        import json
        translations_data = json.loads(translations)
        
        # 出力ファイルのパス
        output_file = os.path.join(user_dir, "translated.pptx")
        
        # 翻訳の適用
        success = PPTXParser.update_pptx_with_translations(
            original_file,
            output_file,
            translations_data
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="翻訳の適用に失敗しました")
        
        # ファイルのダウンロード
        return FileResponse(
            path=output_file,
            filename="translated.pptx",
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="無効な翻訳データ形式です")
    except Exception as e:
        logger.error(f"Error generating translated PPTX: {str(e)}")
        raise HTTPException(status_code=500, detail=f"翻訳済みPPTXの生成に失敗しました: {str(e)}")

def cleanup_temp_files(file_path: str):
    """
    一時ファイルを削除する
    """
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Temporary file removed: {file_path}")
    except Exception as e:
        logger.error(f"Error removing temporary file: {str(e)}") 