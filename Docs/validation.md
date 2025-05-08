# バリデーションルール・制約一覧

このドキュメントは、PPT翻訳アプリの主要なバリデーションルールやDB制約をまとめたものです。

---

## DB制約

- 各テーブルの`@unique`や`@default`、`NOT NULL`制約は`database.md`を参照
- 代表的な制約例：
  - `User.email` … UNIQUE, NOT NULL
  - `File.status` … enum, default: PROCESSING
  - `TranslationHistory.status` … enum, NOT NULL

---

## APIバリデーション

- サインアップ
  - メールアドレス: 必須、メール形式、最大255文字
  - パスワード: 必須、8文字以上
  - 名前: 必須、最大50文字
- サインイン
  - メールアドレス: 必須、メール形式
  - パスワード: 必須
- ファイルアップロード
  - ファイルサイズ: 最大20MB
  - 拡張子: pptx, pdf
- 翻訳リクエスト
  - sourceLang/targetLang: enum値のみ許可
  - fileId: 必須

---

## バリデーション運用ルール

- バリデーションルールを変更した場合はこのファイルも必ず更新すること
- DB制約とAPIバリデーションの両方を意識して設計・実装すること 