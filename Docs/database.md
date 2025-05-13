# データベース設計仕様書

## 技術スタック
- **RDBMS**: PostgreSQL 15.0
- **ORM**: Prisma 5.0
- **マイグレーション**: Prisma Migrate
- **接続プール**: PgBouncer（予定）
- **バックアップ**: 自動バックアップ（日次）

## データモデル

### コアエンティティ

#### User
ユーザー情報を管理するテーブル
```prisma
model User {
  id                 String               @id
  name               String?
  email              String               @unique
  emailVerified      DateTime?
  image              String?
  password           String?
  role               UserRole             @default(USER)
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
  credits            Int                  @default(0)
  Account            Account[]
  ActivityLog        ActivityLog[]
  File               File[]
  Session            Session[]
  TranslationHistory TranslationHistory[]
}

enum UserRole {
  USER
  ADMIN
}
```

#### Account
認証アカウント情報を管理するテーブル
```prisma
model Account {
  id                String  @id
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  users             User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}
```

#### Session
セッション情報を管理するテーブル
```prisma
model Session {
  id           String   @id
  sessionToken String   @unique
  userId       String
  expires      DateTime
  users        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### File
アップロードされたファイル情報を管理するテーブル
```prisma
model File {
  id           String     @id
  userId       String
  originalName String
  storagePath  String
  status       FileStatus @default(PROCESSING)
  fileSize     Int
  mimeType     String
  createdAt    DateTime   @default(now())
  updatedAt    DateTime
  User         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  Slide        Slide[]
  TranslationHistory TranslationHistory[]
}

enum FileStatus {
  PROCESSING
  READY
  ERROR
}
```

#### Slide
ファイル内のスライド情報を管理するテーブル
```prisma
model Slide {
  id        String   @id
  fileId    String
  index     Int
  imagePath String
  createdAt DateTime @default(now())
  updatedAt DateTime
  File      File     @relation(fields: [fileId], references: [id], onDelete: Cascade)
  Text      Text[]
}
```

#### Text
スライド内のテキスト情報を管理するテーブル
```prisma
model Text {
  id          String        @id
  slideId     String
  text        String
  position    Json // { x: number, y: number, width: number, height: number } 形式の座標・サイズ情報を格納
  createdAt   DateTime      @default(now())
  updatedAt   DateTime
  Slide       Slide         @relation(fields: [slideId], references: [id], onDelete: Cascade)
  Translation Translation[]
}
```

#### Translation
翻訳テキストを管理するテーブル
```prisma
model Translation {
  id          String   @id
  createdAt   DateTime @default(now())
  updatedAt   DateTime
  model       String
  sourceLang  Language
  targetLang  Language
  textId      String
  translation String
  Text        Text     @relation(fields: [textId], references: [id], onDelete: Cascade)
}
```

#### TranslationHistory
翻訳履歴を管理するテーブル
```prisma
model TranslationHistory {
  id             String   @id @default(cuid())
  userId         String
  fileId         String
  pageCount      Int      @default(0)
  status         TranslationStatus
  creditsUsed    Int
  sourceLang     Language
  targetLang     Language
  model          String
  fileSize       Int      @default(0)
  processingTime Int      @default(0)
  thumbnailPath  String?
  tags           Json?
  metadata       Json?
  translatedFileKey String?
  errorMessage   String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  file           File     @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@index([fileId])
  @@index([userId, createdAt])
}

enum TranslationStatus {
  PROCESSING
  COMPLETED
  FAILED
}
```

#### ActivityLog
ユーザーアクティビティを記録するテーブル
```prisma
model ActivityLog {
  id          String   @id @default(cuid())
  userId      String
  type        String
  description String
  metadata    Json?
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## API仕様とフロントエンド連携

### アップロードAPI

#### リクエスト
- **エンドポイント**: `/api/upload`
- **メソッド**: POST
- **コンテンツタイプ**: multipart/form-data
- **パラメータ**: 
  - `file`: PPTXファイル

#### レスポンス
```typescript
// サーバー側のレスポンス構造
{
  success: boolean;
  fileId: string;
  slides: Array<{
    index: number;
    texts: Array<{
      text: string;
      position: {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    }>;
    imageUrl: string; // 形式: /api/slides/{fileId}/slides/{imageName}
    translations: any[];
  }>;
}
```

#### フロントエンド期待構造
```typescript
// フロントエンド側が期待する構造
{
  success: boolean;
  fileId: string;
  slides: Array<{
    index: number;
    texts: Array<{
      text: string;
      position: {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    }>;
    imageUrl: string;
    translations: any[];
  }>;
}
```

### スライド画像API

#### リクエスト
- **エンドポイント**: `/api/slides/{fileId}/slides/{imageName}`
- **メソッド**: GET
- **パラメータ**: 
  - `fileId`: ファイルID
  - `imageName`: 画像ファイル名

#### レスポンス
- 画像ファイル（PNG形式）

#### 代替パス形式
- **エンドポイント**: `/api/slides/{fileId}/{imageName}`
- **メソッド**: GET
- **パラメータ**: 
  - `fileId`: ファイルID
  - `imageName`: 画像ファイル名

#### ファイルパス構造
```
// パターン1（新形式）
/tmp/users/{userId}/{fileId}/slides/{imageName}

```

### 翻訳API

#### リクエスト
- **エンドポイント**: `/api/translate`
- **メソッド**: POST
- **コンテンツタイプ**: application/json
- **パラメータ**: 
```typescript
{
  fileId: string;
  sourceLang: string;
  targetLang: string;
  slides: Array<{
    index: number;
    texts: Array<{
      text: string;
      position: {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    }>;
  }>;
}
```

#### レスポンス
```typescript
{
  success: boolean;
  translations: Array<{
    slideIndex: number;
    texts: Array<{
      originalText: string;
      translatedText: string;
      position: {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    }>;
  }>;
}
```

#### フロントエンド期待構造
```typescript
{
  success: boolean;
  translations: Array<{
    slideIndex: number;
    texts: Array<{
      originalText: string;
      translatedText: string;
      position: {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    }>;
  }>;
}
```

## 既知の問題と解決策

### アップロードAPIとフロントエンドの連携
- **問題**: アップロードAPIのログ出力とAPIレスポンスの構造に不一致があった
- **解決策**: ログ出力にも`slides`プロパティを含めるように修正

### スライドAPIのパス構造
- **問題**: 複数のパスパターンが存在し、パス解析ロジックが複雑化
- **解決策**:
  1. パスパラメータ解析ロジックを明確化
  2. 2つのパスパターンを明示的に構築し、両方を試すように修正
  3. 詳細なデバッグログを追加して問題の特定を容易に

### 画像読み込みエラー
- **問題**: スライド画像の読み込みに失敗することがある
- **解決策**:
  1. 画像読み込みエラー時の再試行ロジックを実装
  2. 詳細なエラーログを追加して問題の特定を容易に
  3. 画像パスの構築を統一化

## リレーションシップ

### ユーザー関連
- User → Account: 1対多 (ユーザーは複数の認証アカウントを持つことができる)
- User → Session: 1対多 (ユーザーは複数のセッションを持つことができる)
- User → File: 1対多 (ユーザーは複数のファイルをアップロードできる)
- User → ActivityLog: 1対多 (ユーザーの活動は複数のログとして記録される)
- User → TranslationHistory: 1対多 (ユーザーは複数の翻訳履歴を持つことができる)

### ファイル関連
- File → Slide: 1対多 (1つのファイルは複数のスライドを持つ)
- File → TranslationHistory: 1対多 (1つのファイルは複数の翻訳履歴を持つ)
- Slide → Text: 1対多 (1つのスライドは複数のテキスト要素を持つ)
- Text → Translation: 1対多 (1つのテキストは複数の翻訳を持つことができる)

## インデックス戦略

- ユーザーメールアドレスにユニークインデックス
- ファイルステータスにインデックス
- 翻訳履歴のファイルIDにインデックス
- 翻訳履歴のユーザーIDと作成日時の組み合わせにインデックス
- 使用統計のユーザーID、月、年の組み合わせにユニークインデックス

## データ整合性

### 外部キー制約
- すべての関連するテーブル間に適切な外部キー制約を設定
- 親レコードが削除された場合の動作は、関連するすべての子レコードをカスケード削除

### 一意性制約
- ユーザーのメールアドレス
- セッショントークン
- アカウントのプロバイダーとプロバイダーアカウントIDの組み合わせ
- 使用統計のユーザーID、月、年の組み合わせ

## データ型と制約

- ID: 文字列（CUID形式）
- 日時: DateTime型（タイムゾーン情報を含む）
- テキスト: 標準的な文字列型
- 長いテキスト: Text型
- JSON: PostgreSQLのJSONB型
- 列挙型: 適切な列挙型を使用（Language, FileStatus, UserRole, TranslationStatus）

## マイグレーション戦略

- Prisma Migrateを使用して、スキーマの変更を管理
- 開発環境では`prisma migrate dev`コマンドを使用
- 本番環境では`prisma migrate deploy`コマンドを使用
- マイグレーションファイルはバージョン管理システムで追跡

## バックアップと復元

- 日次の自動バックアップ
- ポイントインタイムリカバリ（PITR）の設定
- バックアップの保持期間: 30日
- 復元手順のドキュメント化と定期的なテスト

## データベース最適化

### インデックス戦略
- **主キー**: すべてのテーブルにID主キー
- **外部キー**: リレーション列にインデックス
- **検索キー**: 頻繁に検索される列にインデックス
- **複合インデックス**: 複数条件での検索に最適化

### パフォーマンスチューニング
- **クエリ最適化**: 実行計画分析
- **インデックス最適化**: 不要なインデックスの削除
- **バキューム**: 定期的なメンテナンス

## セキュリティ対策

### アクセス制御
- **最小権限の原則**: 必要最小限の権限
- **ロールベースアクセス**: 役割に応じた権限（UserRole列挙型を使用）
- **接続制限**: 特定IPからのみアクセス可能

### データ保護
- **暗号化**: 保存データの暗号化
- **マスキング**: 機密データの表示制限
- **監査ログ**: データアクセスの記録（ActivityLogテーブルを使用）