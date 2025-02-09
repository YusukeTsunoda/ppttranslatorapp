#!/bin/bash

# AUTH_SECRET用にランダムな32バイトのデータを生成し、Base64エンコードします。
# 生成結果はコンソールに出力されます。

# opensslの存在チェック
if ! command -v openssl &> /dev/null; then
    echo "エラー: opensslがインストールされていません。インストールしてください。" >&2
    exit 1
fi

# 32バイトのランダムデータを生成してBase64エンコード（結果は約44文字）
AUTH_SECRET=$(openssl rand -base64 32)

# 結果をコンソールに出力
echo "${AUTH_SECRET}" 