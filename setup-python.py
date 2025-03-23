#!/usr/bin/env python3
import subprocess
import sys
import os

def install_dependency(package_name):
    print(f"Installing {package_name}...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", package_name])
        print(f"Successfully installed {package_name}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to install {package_name}: {e}")
        return False

def check_dependency(module_name):
    try:
        __import__(module_name)
        print(f"{module_name} is already installed")
        return True
    except ImportError:
        print(f"{module_name} is not installed")
        return False

# 必要な依存関係
dependencies = {
    "python-pptx": "pptx",
    "pdf2image": "pdf2image",
    "Pillow": "PIL",
}

# 各依存関係をチェックしてインストール
success = True
for package, module in dependencies.items():
    if not check_dependency(module):
        if not install_dependency(package):
            success = False

if success:
    print("\n✅ すべての依存関係のインストールが完了しました")
    sys.exit(0)
else:
    print("\n❌ 一部の依存関係のインストールに失敗しました")
    sys.exit(1) 