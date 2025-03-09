# データベース設計仕様書

## 技術スタック
- **RDBMS**: PostgreSQL 15.0
- **ORM**: Prisma 6.0
- **マイグレーション**: Prisma Migrate
- **接続プール**: PgBouncer（予定）
- **バックアップ**: 自動バックアップ（日次）

## データモデル

### コアエンティティ

#### users
ユーザー情報を管理するテーブル
```prisma
model User {
  id                String         @id @default(cuid())
  name              String?
  email             String         @unique
  emailVerified     DateTime?
  image             String?
  password          String?        // ハッシュ化されたパスワード
  role              UserRole       @default(USER)
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  deletedAt         DateTime?      // 論理削除用
  
  // リレーション
  accounts          Account[]
  sessions          Session[]
  teamMembers       TeamMember[]
  activityLogs      ActivityLog[]
  
  // インデックス
  @@index([email])
  @@index([deletedAt])
}

enum UserRole {
  ADMIN
  USER
}
```

#### teams
チーム情報を管理するテーブル
```prisma
model Team {
  id                  String         @id @default(cuid())
  name                String
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  stripeCustomerId    String?        @unique
  stripeSubscriptionId String?       @unique
  
  // リレーション
  members             TeamMember[]
  files               File[]
  invitations         Invitation[]
  activityLogs        ActivityLog[]
  subscriptions       Subscription[]
  translationMemories TranslationMemory[]
  glossaries          Glossary[]
  
  // インデックス
  @@index([stripeCustomerId])
  @@index([stripeSubscriptionId])
}
```

#### team_members
チームメンバーシップを管理するテーブル
```prisma
model TeamMember {
  id        String       @id @default(cuid())
  userId    String
  teamId    String
  role      MemberRole   @default(MEMBER)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  
  // リレーション
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  team      Team         @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  // インデックス
  @@unique([userId, teamId])
  @@index([teamId])
  @@index([userId])
}

enum MemberRole {
  OWNER
  ADMIN
  MEMBER
}
```

#### files
アップロードされたファイル情報を管理するテーブル
```prisma
model File {
  id            String       @id @default(cuid())
  teamId        String
  originalName  String
  storagePath   String
  status        FileStatus   @default(PROCESSING)
  fileSize      Int
  mimeType      String
  metadata      Json?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  // リレーション
  team          Team         @relation(fields: [teamId], references: [id], onDelete: Cascade)
  slides        Slide[]
  
  // インデックス
  @@index([teamId])
  @@index([status])
  @@index([createdAt])
}

enum FileStatus {
  PROCESSING
  READY
  ERROR
}
```

#### slides
ファイル内のスライド情報を管理するテーブル
```prisma
model Slide {
  id            String       @id @default(cuid())
  fileId        String
  index         Int
  imagePath     String
  metadata      Json?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  // リレーション
  file          File         @relation(fields: [fileId], references: [id], onDelete: Cascade)
  texts         Text[]
  
  // インデックス
  @@index([fileId])
  @@unique([fileId, index])
}
```

#### texts
スライド内のテキスト情報を管理するテーブル
```prisma
model Text {
  id            String       @id @default(cuid())
  slideId       String
  text          String       @db.Text
  position      Json
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  // リレーション
  slide         Slide        @relation(fields: [slideId], references: [id], onDelete: Cascade)
  translations  Translation[]
  
  // インデックス
  @@index([slideId])
}
```

#### translations
翻訳テキストを管理するテーブル
```prisma
model Translation {
  id            String       @id @default(cuid())
  textId        String
  sourceLang    Language
  targetLang    Language
  translation   String       @db.Text
  model         String
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  // リレーション
  text          Text         @relation(fields: [textId], references: [id], onDelete: Cascade)
  
  // インデックス
  @@index([textId])
  @@index([sourceLang, targetLang])
}

enum Language {
  ja
  en
  zh
  ko
}
```

### サポートエンティティ

#### subscriptions
サブスクリプション情報を管理するテーブル
```prisma
model Subscription {
  id                  String             @id @default(cuid())
  teamId              String
  stripeSubscriptionId String            @unique
  status              SubscriptionStatus @default(TRIALING)
  plan                SubscriptionPlan   @default(FREE)
  currentPeriodStart  DateTime
  currentPeriodEnd    DateTime
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  
  // リレーション
  team                Team               @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  // インデックス
  @@index([teamId])
  @@index([status])
  @@index([plan])
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
}

enum SubscriptionPlan {
  FREE
  PREMIUM
}
```

#### activity_logs
ユーザーアクティビティを記録するテーブル
```prisma
model ActivityLog {
  id            String          @id @default(cuid())
  teamId        String
  userId        String
  action        ActivityAction
  ipAddress     String
  metadata      Json?
  createdAt     DateTime        @default(now())
  
  // リレーション
  team          Team            @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // インデックス
  @@index([teamId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}

enum ActivityAction {
  FILE_UPLOAD
  TRANSLATION
  DOWNLOAD
  SETTINGS_CHANGE
  MEMBER_INVITE
}
```

#### invitations
チーム招待を管理するテーブル
```prisma
model Invitation {
  id            String           @id @default(cuid())
  teamId        String
  email         String
  role          MemberRole       @default(MEMBER)
  status        InvitationStatus @default(PENDING)
  expiresAt     DateTime
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  
  // リレーション
  team          Team             @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  // インデックス
  @@index([teamId])
  @@index([email])
  @@index([status])
  @@index([expiresAt])
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
}
```

#### translation_memory
翻訳メモリを管理するテーブル
```prisma
model TranslationMemory {
  id              String       @id @default(cuid())
  teamId          String
  sourceText      String       @db.Text
  translatedText  String       @db.Text
  sourceLang      Language
  targetLang      Language
  usageCount      Int          @default(0)
  lastUsedAt      DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  // リレーション
  team            Team         @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  // インデックス
  @@index([teamId])
  @@index([sourceLang, targetLang])
  @@index([usageCount])
}
```

#### glossary
用語集を管理するテーブル
```prisma
model Glossary {
  id              String       @id @default(cuid())
  teamId          String
  sourceTerm      String
  translatedTerm  String
  sourceLang      Language
  targetLang      Language
  domain          String?
  priority        Int          @default(0)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  
  // リレーション
  team            Team         @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  // インデックス
  @@index([teamId])
  @@index([sourceLang, targetLang])
  @@index([domain])
  @@index([priority])
}
```

### 認証関連エンティティ

#### accounts
OAuth連携アカウント情報を管理するテーブル
```prisma
model Account {
  id                 String    @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String?   @db.Text
  access_token       String?   @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?   @db.Text
  session_state      String?
  
  // リレーション
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // インデックス
  @@unique([provider, providerAccountId])
  @@index([userId])
}
```

#### sessions
ユーザーセッション情報を管理するテーブル
```prisma
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  
  // リレーション
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // インデックス
  @@index([userId])
}
```

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

## バックアップと復元

### バックアップ戦略
- **フルバックアップ**: 日次
- **増分バックアップ**: 6時間ごと
- **トランザクションログ**: 継続的

### 保持ポリシー
- **日次バックアップ**: 7日間
- **週次バックアップ**: 4週間
- **月次バックアップ**: 12ヶ月

### 復元手順
1. **バックアップ選択**: 復元ポイントの決定
2. **データ復元**: バックアップからの復元
3. **整合性検証**: データ検証
4. **アプリケーション再開**: サービス再開

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