# データベース設計仕様書

## 技術スタック
- **RDBMS**: PostgreSQL 15.0
- **ORM**: Prisma 6.0
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
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
  credits            Int                  @default(0)
  Account            Account[]
  ActivityLog        ActivityLog[]
  File               File[]
  Session            Session[]
  TranslationHistory TranslationHistory[]
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

  @@unique([fileId, index])
}
```

#### Text
スライド内のテキスト情報を管理するテーブル
```prisma
model Text {
  id          String        @id
  slideId     String
  text        String
  position    Json
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
  id          String   @id @default(cuid())
  userId      String
  fileName    String
  pageCount   Int      @default(0)
  status      String
  creditsUsed Int
  sourceLang  Language
  targetLang  Language
  model       String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
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

#### UsageStatistics
使用統計情報を管理するテーブル
```prisma
model UsageStatistics {
  id         String   @id @default(cuid())
  userId     String
  tokenCount Int      @default(0)
  apiCalls   Int      @default(0)
  month      Int
  year       Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([userId, month, year])
}
```

### 言語設定

```prisma
enum Language {
  ja
  en
  zh
  ko
  fr
  de
  es
  it
  ru
  pt
}
```

## リレーションシップ

### ユーザー関連
- User → Account: 1対多 (ユーザーは複数の認証アカウントを持つことができる)
- User → Session: 1対多 (ユーザーは複数のセッションを持つことができる)
- User → File: 1対多 (ユーザーは複数のファイルをアップロードできる)
- User → ActivityLog: 1対多 (ユーザーの活動は複数のログとして記録される)
- User → TranslationHistory: 1対多 (ユーザーは複数の翻訳履歴を持つことができる)

### ファイル関連
- File → Slide: 1対多 (1つのファイルは複数のスライドを持つ)
- Slide → Text: 1対多 (1つのスライドは複数のテキスト要素を持つ)
- Text → Translation: 1対多 (1つのテキストは複数の翻訳を持つことができる)

## インデックス戦略

- ユーザーメールアドレスにユニークインデックス
- ファイルステータスにインデックス
- スライドのファイルIDとインデックスの組み合わせにユニークインデックス
- 翻訳の言語ペア（ソース言語とターゲット言語）にインデックス
- 使用統計のユーザーID、月、年の組み合わせにユニークインデックス

## データ整合性

### 外部キー制約
- すべての関連するテーブル間に適切な外部キー制約を設定
- 親レコードが削除された場合の動作は、関連するすべての子レコードをカスケード削除

### 一意性制約
- ユーザーのメールアドレス
- セッショントークン
- アカウントのプロバイダーとプロバイダーアカウントIDの組み合わせ
- スライドのファイルIDとインデックスの組み合わせ
- 使用統計のユーザーID、月、年の組み合わせ

## データ型と制約

- ID: 文字列（CUID形式）
- 日時: DateTime型（タイムゾーン情報を含む）
- テキスト: 標準的な文字列型
- 長いテキスト: Text型
- JSON: PostgreSQLのJSONB型
- 列挙型: 適切な列挙型を使用（Language, FileStatus）

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
- **パーティショニング**: 大規模テーブルの分割（予定）
- **バキューム**: 定期的なメンテナンス

### データ整合性
- **外部キー制約**: リレーショナルデータの整合性
- **カスケード削除**: 依存レコードの自動削除
- **NOT NULL制約**: 必須フィールドの保証
- **ユニーク制約**: 一意性の保証

## マイグレーション戦略

### 開発フロー
1. **スキーマ変更**: Prismaスキーマの更新
2. **マイグレーション生成**: `prisma migrate dev`
3. **テスト**: 開発環境での検証
4. **適用**: 本番環境への適用

### バージョン管理
- **マイグレーションファイル**: Git管理
- **ロールバック計画**: 問題発生時の対応
- **データ保全**: バックアップと復元

### シードデータ
- **初期データ**: 基本設定、マスターデータ
- **テストデータ**: 開発・テスト環境用
- **サンプルデータ**: デモ用

## セキュリティ対策

### アクセス制御
- **最小権限の原則**: 必要最小限の権限
- **ロールベースアクセス**: 役割に応じた権限
- **接続制限**: 特定IPからのみアクセス可能

### データ保護
- **暗号化**: 保存データの暗号化
- **マスキング**: 機密データの表示制限
- **監査ログ**: データアクセスの記録

### コンプライアンス
- **GDPR対応**: 個人データの保護
- **データ削除**: 要求に応じたデータ削除
- **データポータビリティ**: データエクスポート