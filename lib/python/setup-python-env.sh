#!/bin/bash

# PPTXパーサーと画像最適化に必要なPythonパッケージをインストールするスクリプト

echo "PPTXパーサー環境セットアップを開始します..."

# 仮想環境の作成（存在しない場合）
if [ ! -d "venv" ]; then
    echo "Python仮想環境を作成しています..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "エラー: Python仮想環境の作成に失敗しました。Python 3.6以上がインストールされていることを確認してください。"
        exit 1
    fi
    echo "Python仮想環境を作成しました。"
else
    echo "既存のPython仮想環境を使用します。"
fi

# 仮想環境をアクティベート
echo "仮想環境をアクティベートしています..."
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo "エラー: 仮想環境のアクティベートに失敗しました。"
    exit 1
fi

# pipのアップグレード
echo "pipをアップグレードしています..."
pip install --upgrade pip

# 必要なパッケージのインストール
echo "必要なパッケージをインストールしています..."
pip install python-pptx pdf2image Pillow numpy

# 画像処理用の追加パッケージ
echo "画像処理用パッケージをインストールしています..."
pip install pillow-heif webp

echo "インストールされたパッケージ:"
pip list

echo "セットアップが完了しました。"
echo "使用方法: source venv/bin/activate で仮想環境をアクティベートしてから、Pythonスクリプトを実行してください。"
