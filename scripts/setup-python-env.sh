#!/bin/bash

# Python仮想環境のセットアップスクリプト

# スクリプトのディレクトリを取得
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# 仮想環境のディレクトリ
VENV_DIR="$PROJECT_ROOT/venv"

# 必要なPythonパッケージ
REQUIRED_PACKAGES=("python-pptx" "Pillow" "numpy" "pdf2image")

# カラー表示用
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Python仮想環境のセットアップを開始します...${NC}"

# Pythonのバージョン確認
PYTHON_VERSION=$(python3 --version 2>&1)
if [ $? -ne 0 ]; then
  echo -e "${RED}Python 3がインストールされていません。Python 3をインストールしてください。${NC}"
  exit 1
fi

echo -e "${GREEN}使用するPythonバージョン: ${PYTHON_VERSION}${NC}"

# 仮想環境の作成
if [ ! -d "$VENV_DIR" ]; then
  echo -e "${YELLOW}仮想環境を作成しています...${NC}"
  python3 -m venv "$VENV_DIR"
  if [ $? -ne 0 ]; then
    echo -e "${RED}仮想環境の作成に失敗しました。${NC}"
    exit 1
  fi
  echo -e "${GREEN}仮想環境を作成しました: $VENV_DIR${NC}"
else
  echo -e "${YELLOW}既存の仮想環境を使用します: $VENV_DIR${NC}"
fi

# 仮想環境をアクティベート
echo -e "${YELLOW}仮想環境をアクティベートしています...${NC}"
source "$VENV_DIR/bin/activate"
if [ $? -ne 0 ]; then
  echo -e "${RED}仮想環境のアクティベートに失敗しました。${NC}"
  exit 1
fi

# pipのアップグレード
echo -e "${YELLOW}pipをアップグレードしています...${NC}"
pip install --upgrade pip
if [ $? -ne 0 ]; then
  echo -e "${RED}pipのアップグレードに失敗しました。${NC}"
  exit 1
fi

# 必要なパッケージのインストール
echo -e "${YELLOW}必要なPythonパッケージをインストールしています...${NC}"
for package in "${REQUIRED_PACKAGES[@]}"; do
  echo -e "${YELLOW}パッケージをインストール中: $package${NC}"
  pip install "$package"
  if [ $? -ne 0 ]; then
    echo -e "${RED}パッケージのインストールに失敗しました: $package${NC}"
    exit 1
  fi
  echo -e "${GREEN}パッケージをインストールしました: $package${NC}"
done

# 環境変数の設定方法を表示
echo -e "\n${GREEN}セットアップが完了しました！${NC}"
echo -e "${YELLOW}仮想環境を使用するには、以下のコマンドを実行してください:${NC}"
echo -e "  source $VENV_DIR/bin/activate"
echo -e "\n${YELLOW}アプリケーションの実行時に仮想環境のPythonを使用するには、以下の環境変数を設定してください:${NC}"
echo -e "  export PYTHON_PATH=$VENV_DIR/bin/python"
echo -e "\n${YELLOW}または、.envファイルに以下の行を追加してください:${NC}"
echo -e "  PYTHON_PATH=$VENV_DIR/bin/python"

# 仮想環境を非アクティベート
deactivate

echo -e "\n${GREEN}セットアップスクリプトが完了しました。${NC}"
