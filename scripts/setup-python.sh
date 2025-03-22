#!/bin/bash

# エラーが発生したら即座に停止
set -e

echo "Setting up Python environment..."

# Python3とpip3が利用可能か確認
if ! command -v python3.11 &> /dev/null; then
    echo "Python 3.11 is not installed. Please install it first."
    exit 1
fi

if ! command -v pip3 &> /dev/null; then
    echo "pip3 is not installed. Please install it first."
    exit 1
fi

# 仮想環境の作成（存在しない場合）
if [ ! -d ".venv" ]; then
    python3.11 -m venv .venv
fi

# 仮想環境のアクティベート
source .venv/bin/activate

# 依存関係のインストール
pip install -r requirements.txt

# macOSの場合、HomebrewでLibreOfficeとPopplerをインストール
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v brew &> /dev/null; then
        echo "Homebrew is not installed. Please install it first."
        exit 1
    fi
    
    # LibreOfficeのインストール（存在しない場合）
    if ! command -v soffice &> /dev/null; then
        brew install libreoffice
    fi
    
    # Popplerのインストール（存在しない場合）
    if ! command -v pdftoppm &> /dev/null; then
        brew install poppler
    fi
fi

echo "Python environment setup completed successfully!" 