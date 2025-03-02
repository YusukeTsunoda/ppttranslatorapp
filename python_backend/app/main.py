from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import logging

from app.api.routes import pptx, slides

# ロギングの設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PPT Translator API",
    description="PowerPointスライドの翻訳APIサービス",
    version="1.0.0",
)

# CORSミドルウェアの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限すること
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静的ファイルのマウント（一時的なスライド画像用）
os.makedirs("/app/tmp", exist_ok=True)
app.mount("/static", StaticFiles(directory="/app/tmp"), name="static")

# ルーターの登録
app.include_router(pptx.router, prefix="/api/pptx", tags=["PPTX"])
app.include_router(slides.router, prefix="/api/slides", tags=["スライド"])

@app.get("/api/health", tags=["ヘルスチェック"])
async def health_check():
    """
    APIサーバーのヘルスチェックエンドポイント
    """
    return {"status": "healthy"}

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    グローバル例外ハンドラー
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "内部サーバーエラーが発生しました。"},
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.getenv("PORT", "3000")), reload=True) 