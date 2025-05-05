#!/usr/bin/env python3
import sys
import json
import os
import argparse
import requests
from typing import List, Dict, Any, Optional

def translate_with_claude(
    texts: List[str],
    source_lang: str,
    target_lang: str,
    model: str
) -> List[str]:
    """
    Claude APIを使用してテキストを翻訳する

    Args:
        texts: 翻訳するテキストのリスト
        source_lang: 元の言語コード (ja, en など)
        target_lang: 翻訳先の言語コード (ja, en など)
        model: 使用するClaudeモデル名

    Returns:
        翻訳されたテキストのリスト
    """
    # 環境変数からAPIキーを取得
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY環境変数が設定されていません", file=sys.stderr)
        return ["翻訳エラー: APIキーが設定されていません"] * len(texts)

    # 言語名のマッピング
    language_map = {
        "ja": "日本語",
        "en": "英語",
        "zh": "中国語",
        "ko": "韓国語",
        "fr": "フランス語",
        "de": "ドイツ語",
        "es": "スペイン語",
        "it": "イタリア語",
        "ru": "ロシア語",
        "pt": "ポルトガル語"
    }

    # 言語名を取得
    source_lang_name = language_map.get(source_lang, source_lang)
    target_lang_name = language_map.get(target_lang, target_lang)

    # APIリクエストの設定
    api_url = "https://api.anthropic.com/v1/messages"
    headers = {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": api_key
    }

    # 結果を格納するリスト
    translated_texts = []

    # 各テキストを翻訳
    for text in texts:
        if not text or text.strip() == "":
            translated_texts.append("")
            continue

        # Claude用のプロンプト作成
        system_prompt = f"""あなたは優れた翻訳者です。与えられたテキストを{source_lang_name}から{target_lang_name}に翻訳してください。
翻訳のみを行い、元のテキストの意味と文体を保持してください。
元の書式も維持し、説明や追加のコメントは含めないでください。"""

        user_prompt = f"""以下の{source_lang_name}テキストを{target_lang_name}に翻訳してください:

{text}"""

        # APIリクエストデータ
        data = {
            "model": model,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": 4000
        }

        try:
            # APIリクエスト送信
            response = requests.post(api_url, headers=headers, json=data)
            response.raise_for_status()  # エラーがあれば例外を発生
            response_data = response.json()

            # レスポンスから翻訳テキストを抽出
            translated_text = response_data.get("content", [{"text": "翻訳エラー"}])[0].get("text", "翻訳エラー")
            translated_texts.append(translated_text)

        except Exception as e:
            print(f"翻訳APIエラー: {str(e)}", file=sys.stderr)
            translated_texts.append(f"翻訳エラー: {str(e)}")

    return translated_texts

def parse_arguments():
    """コマンドライン引数をパース"""
    parser = argparse.ArgumentParser(description='テキスト翻訳')
    parser.add_argument('--texts', type=str, required=True, help='翻訳するテキスト (JSON形式の配列)')
    parser.add_argument('--source-lang', type=str, required=True, help='元の言語コード')
    parser.add_argument('--target-lang', type=str, required=True, help='翻訳先の言語コード')
    parser.add_argument('--model', type=str, required=True, help='使用するモデル')
    return parser.parse_args()

def main():
    """メイン関数"""
    args = parse_arguments()
    
    # テキスト配列を解析
    try:
        texts = json.loads(args.texts)
        if not isinstance(texts, list):
            texts = [texts]
    except json.JSONDecodeError:
        texts = [args.texts]
        
    # 翻訳を実行
    translated_texts = translate_with_claude(
        texts,
        args.source_lang,
        args.target_lang,
        args.model
    )
    
    # 結果をJSON形式で出力
    result = {
        "translations": translated_texts,
        "metadata": {
            "model": args.model,
            "source_lang": args.source_lang,
            "target_lang": args.target_lang
        }
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    main() 