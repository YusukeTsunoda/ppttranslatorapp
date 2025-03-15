# シーケンス図

## ファイルアップロードと翻訳フロー

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant Storage
    participant Claude
    participant Database
    participant Cache

    User->>Frontend: PPTXファイルをアップロード
    Frontend->>Frontend: ファイルバリデーション
    Frontend->>Backend: ファイルをPOST /api/upload
    Backend->>Backend: セッション検証
    Backend->>Storage: ファイルを保存
    Backend->>Backend: PPTXを解析
    Backend->>Storage: スライド画像を保存
    Backend->>Database: メタデータ保存
    Backend->>Frontend: スライド情報を返却

    loop 各スライド
        Frontend->>Backend: 翻訳リクエスト POST /api/translate
        Backend->>Cache: 翻訳メモリ検索
        alt キャッシュヒット
            Cache->>Backend: 既存の翻訳結果
        else キャッシュミス
            Backend->>Claude: テキスト翻訳リクエスト
            Claude->>Backend: 翻訳結果
            Backend->>Cache: 翻訳結果を保存
        end
        Backend->>Database: 翻訳履歴保存
        Backend->>Frontend: 翻訳結果を返却
    end

    User->>Frontend: 翻訳結果を確認・編集
    Frontend->>Backend: 編集内容を保存 POST /api/translations/update
    Backend->>Database: 編集内容を保存
    Backend->>Frontend: 保存完了通知

    User->>Frontend: ダウンロードをリクエスト
    Frontend->>Backend: POST /api/pptx/generate
    Backend->>Storage: 翻訳済みPPTXを生成
    Backend->>Database: ダウンロード履歴記録
    Backend->>Frontend: ダウンロードURLを返却
    Frontend->>User: 翻訳済みPPTXをダウンロード

    alt Premiumプラン未加入
        User->>Frontend: Premiumプランへのアップグレード
        Frontend->>Backend: POST /api/checkout
        Backend->>Stripe: チェックアウトセッション作成
        Stripe->>Frontend: セッションURL
        Frontend->>User: Stripe決済ページへリダイレクト
    end
```

## 認証フロー

### メール/パスワード認証フロー

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant NextAuth
    participant CredentialsProvider
    participant PrismaAdapter
    participant PostgreSQL

    User->>Frontend: メール・パスワードを入力
    Frontend->>NextAuth: /api/auth/signin/credentials
    NextAuth->>CredentialsProvider: 認証情報を検証
    CredentialsProvider->>PrismaAdapter: ユーザー検索
    PrismaAdapter->>PostgreSQL: メールアドレスでユーザー検索
    PostgreSQL->>PrismaAdapter: ユーザーデータ
    PrismaAdapter->>CredentialsProvider: ユーザー情報
    CredentialsProvider->>CredentialsProvider: パスワード検証
    CredentialsProvider->>NextAuth: 認証結果
    NextAuth->>Frontend: JWTセッショントークン発行
    Frontend->>User: ダッシュボードにリダイレクト
```

### セッション管理フロー

```mermaid
sequenceDiagram
    participant Frontend
    participant NextAuth
    participant JWT
    participant PrismaAdapter
    participant PostgreSQL

    Frontend->>NextAuth: セッション確認
    NextAuth->>JWT: トークン検証
    JWT->>NextAuth: 検証結果
    alt トークンが有効
        NextAuth->>PrismaAdapter: ユーザー情報取得
        PrismaAdapter->>PostgreSQL: ユーザーデータ取得
        PostgreSQL->>PrismaAdapter: ユーザーデータ
        PrismaAdapter->>NextAuth: ユーザー情報
        NextAuth->>Frontend: セッション情報
    else トークンが無効
        NextAuth->>Frontend: 未認証エラー
        Frontend->>Frontend: ログインページにリダイレクト
    end
```

### ログアウトフロー

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant NextAuth
    participant JWT
    participant ActivityLogger

    User->>Frontend: ログアウトボタンをクリック
    Frontend->>NextAuth: /api/auth/signout
    NextAuth->>JWT: トークン無効化
    NextAuth->>ActivityLogger: ログアウトアクティビティ記録
    NextAuth->>Frontend: セッションクリア
    Frontend->>User: ログインページにリダイレクト
```

## セッション更新フロー

```mermaid
sequenceDiagram
    participant Frontend
    participant AuthAPI
    participant JWT
    participant Cache

    Frontend->>Frontend: アクセストークン有効期限チェック
    alt トークン期限切れ
        Frontend->>AuthAPI: POST /api/auth/refresh
        AuthAPI->>JWT: 更新トークン検証
        alt 更新トークン有効
            JWT->>AuthAPI: 検証結果
            AuthAPI->>JWT: 新規トークン生成
            JWT->>AuthAPI: 新規アクセス・更新トークン
            AuthAPI->>Cache: セッション情報更新
            AuthAPI->>Frontend: 新規トークン
            Frontend->>Frontend: ローカルストレージ更新
        else 更新トークン無効
            JWT->>AuthAPI: 検証エラー
            AuthAPI->>Frontend: 認証エラー
            Frontend->>Frontend: ログアウト処理
            Frontend->>Frontend: ログインページへリダイレクト
        end
    end
```

## ファイル処理エラーハンドリングフロー

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant Storage
    participant ErrorHandler
    participant Monitoring

    User->>Frontend: ファイル処理リクエスト
    Frontend->>Backend: API呼び出し
    
    alt 正常処理
        Backend->>Storage: ファイル処理
        Storage->>Backend: 処理結果
        Backend->>Frontend: 成功レスポンス
        Frontend->>User: 成功通知
    else エラー発生
        Backend->>ErrorHandler: エラー情報送信
        ErrorHandler->>Monitoring: エラーログ記録
        ErrorHandler->>Backend: エラー分類・対応策
        Backend->>Frontend: エラーレスポンス（コード・メッセージ）
        Frontend->>User: ユーザーフレンドリーなエラー表示
        Frontend->>Frontend: リトライ/代替手段の提案
    end
```

# PPTXファイルアップロードから翻訳までのシーケンス図と問題分析

## 現在のデータフロー

```mermaid
sequenceDiagram
    participant ユーザー as ユーザー
    participant フロントエンド as フロントエンド (React)
    participant アップロードAPI as アップロードAPI (upload/route.ts)
    participant PPTXParser as PPTXParser (lib/pptx/parser.ts)
    participant Python as Pythonスクリプト (lib/python/pptx_parser.py)
    participant 翻訳API as 翻訳API (translate/route.ts)
    participant Claude as Claude API (Anthropic)
    participant ファイルシステム as ファイルシステム
    
    ユーザー->>フロントエンド: PPTXファイルを選択
    フロントエンド->>アップロードAPI: FormDataでファイルをPOST
    
    アップロードAPI->>ファイルシステム: ユーザーディレクトリ作成
    アップロードAPI->>ファイルシステム: PPTXファイル保存
    
    アップロードAPI->>PPTXParser: parsePPTX(filePath, slidesDir)呼び出し
    PPTXParser->>Python: pptx_parser.pyをPythonShellで実行
    
    Python->>Python: PPTXファイルを読み込み
    Python->>Python: LibreOfficeでPDFに変換
    Python->>Python: PDFをPNG画像に変換
    Python->>ファイルシステム: スライド画像を保存
    Python->>Python: テキスト要素を抽出
    
    Python-->>PPTXParser: JSON形式のスライドデータ返却
    PPTXParser-->>アップロードAPI: スライドデータ返却
    
    アップロードAPI->>アップロードAPI: スライドデータを正規化
    アップロードAPI-->>フロントエンド: 成功レスポンス (slides配列含む)
    
    フロントエンド->>フロントエンド: スライドデータを表示
    
    Note over フロントエンド: ここで原文が[object Object]として表示される問題が発生
    
    ユーザー->>フロントエンド: 翻訳ボタンをクリック
    フロントエンド->>翻訳API: テキスト配列を送信
    
    翻訳API->>Claude: プロンプトを作成して送信
    Claude-->>翻訳API: 翻訳結果を返却
    翻訳API-->>フロントエンド: 翻訳結果を返却
    
    フロントエンド->>フロントエンド: 翻訳結果を表示
```

## 問題分析

現在、スライドの原文が`[object Object]`として表示されている問題が発生しています。コンソール出力とスクリーンショットから、以下の問題点が特定されました：

### 1. データ構造の不一致

フロントエンドのコンポーネント（PreviewSection.tsx）では、スライドのテキストを以下のように表示しています：

```tsx
<p className="text-sm">{slide.texts.join("\n")}</p>
```

しかし、`slide.texts`は文字列の配列ではなく、オブジェクトの配列になっています。型定義（types.ts）では：

```typescript
export interface TextItem {
  text: string;
  position: TextPosition;
}

export interface Slide {
  index: number;
  imageUrl: string;
  texts: TextItem[];  // TextItemオブジェクトの配列
  translations?: TranslationItem[];
}
```

このため、`join()`メソッドを呼び出すと、各オブジェクトはデフォルトの`toString()`メソッドで文字列化され、`[object Object]`として表示されています。

### 2. ログ出力エラー

コンソール出力には以下のエラーも表示されています：

```
File operation logging error: TypeError: Cannot read properties of undefined (reading 'create')
```

これは`logFileOperation`関数内で`prisma.activityLog.create`を呼び出そうとしていますが、`activityLog`が存在しないことを示しています。Prismaスキーマに`ActivityLog`モデルが定義されていないか、正しく生成されていない可能性があります。

## 修正方法

1. **テキスト表示の修正**:
   - PreviewSection.tsxを修正して、オブジェクト配列から文字列を正しく抽出する
   ```tsx
   <p className="text-sm">{slide.texts.map(item => item.text).join("\n")}</p>
   ```

2. **翻訳APIへのデータ送信**:
   - 翻訳APIにテキストを送信する際に、オブジェクトではなく文字列を送信するよう修正

3. **Prismaスキーマの修正**:
   - `ActivityLog`モデルをPrismaスキーマに追加するか、ログ機能を一時的に無効化 