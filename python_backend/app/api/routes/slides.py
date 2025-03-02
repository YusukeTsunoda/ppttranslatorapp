from fastapi import APIRouter, HTTPException, Path
from fastapi.responses import FileResponse
import os
import re
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# 一時ディレクトリのパス
TEMP_DIR = "/app/tmp"

# パスの検証関数
def validate_path(path: str) -> bool:
    """
    パスの安全性を検証する
    
    Args:
        path: 検証するパス
        
    Returns:
        bool: 安全なパスの場合True
    """
    # パスに '..' が含まれていないことを確認（ディレクトリトラバーサル対策）
    if '..' in path:
        return False
    
    # パスの形式を検証（例：fileId/slide_1.png）
    path_pattern = r'^[\w-]+/slide_\d+\.png$'
    if not re.match(path_pattern, path):
        return False
    
    return True

@router.get("/{file_id}/{slide_name}", summary="スライド画像を取得")
async def get_slide(
    file_id: str = Path(..., description="ファイルID"),
    slide_name: str = Path(..., description="スライド名（例: slide_1.png）")
):
    """
    指定されたスライド画像を取得する
    """
    # パスの構築
    path = f"{file_id}/{slide_name}"
    
    # パスの検証
    if not validate_path(path):
        raise HTTPException(status_code=400, detail="無効なファイルパスです")
    
    # ファイルパスの構築
    file_path = os.path.join(TEMP_DIR, path)
    
    # ファイルの存在確認
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")
    
    # ファイルを返す
    return FileResponse(
        path=file_path,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"}
    ) 