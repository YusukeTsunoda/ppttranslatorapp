FROM python:3.9-slim

WORKDIR /app

# システムの依存関係をインストール
RUN apt-get update && apt-get install -y \
    libreoffice \
    poppler-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Pythonの依存関係をインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY ./app ./app

# 一時ディレクトリを作成
RUN mkdir -p /app/tmp

# 環境変数を設定
ENV PYTHONPATH=/app
ENV PORT=3000

# アプリケーションを実行
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "${PORT:-3000}"] 