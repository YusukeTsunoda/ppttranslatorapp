# アプリケーション図解集

## 1. シーケンス図

### 1.1 認証フロー
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant AuthAPI
    participant NextAuth
    participant Database
    
    User->>Frontend: ログイン/サインアップ画面アクセス
    Frontend->>AuthAPI: 認証リクエスト
    AuthAPI->>NextAuth: 認証処理
    NextAuth->>Database: ユーザー検証
    Database-->>NextAuth: ユーザー情報
    NextAuth-->>AuthAPI: JWT生成
    AuthAPI-->>Frontend: セッション確立
    Frontend-->>User: ダッシュボードにリダイレクト
```

### 1.2 サブスクリプションフロー
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API
    participant Stripe
    participant Database

    User->>Frontend: プラン選択
    Frontend->>API: チェックアウトセッション作成
    API->>Stripe: セッション作成リクエスト
    Stripe-->>API: セッションID
    API-->>Frontend: セッション情報
    Frontend->>Stripe: チェックアウトページ
    User->>Stripe: 支払い情報入力
    Stripe->>API: Webhook (支払い完了)
    API->>Database: サブスクリプション更新
    API-->>Frontend: 完了通知
    Frontend-->>User: 完了画面表示
```

## 2. コンポーネント図
```mermaid
graph TB
    subgraph Frontend
        UI[UI Components]
        Pages[Next.js Pages]
        Auth[Auth Provider]
    end

    subgraph Backend
        API[API Routes]
        DB[Database]
        Cache[Redis Cache]
    end

    subgraph External
        Stripe[Stripe API]
        Email[Email Service]
    end

    UI --> Pages
    Pages --> API
    Auth --> API
    API --> DB
    API --> Cache
    API --> Stripe
    API --> Email
```

## 3. ユースケース図
```mermaid
graph TB
    subgraph Actors
        User((一般ユーザー))
        Admin((管理者))
    end

    subgraph System
        Auth[認証管理]
        Sub[サブスクリプション管理]
        Team[チーム管理]
        Pay[支払い管理]
        Profile[プロフィール管理]
    end

    User --> Auth
    User --> Sub
    User --> Team
    User --> Pay
    User --> Profile
    
    Admin --> Auth
    Admin --> Sub
    Admin --> Team
    Admin --> Pay
    Admin --> Profile
```

## 4. 状態遷移図（サブスクリプション）
```mermaid
stateDiagram-v2
    [*] --> Free
    Free --> Trial: 試用開始
    Trial --> Subscribed: 支払い完了
    Trial --> Expired: 試用期間終了
    Subscribed --> Cancelled: キャンセル
    Cancelled --> Free: 期間終了
    Subscribed --> Past_Due: 支払い失敗
    Past_Due --> Subscribed: 支払い回復
    Past_Due --> Cancelled: 未払い継続
```

## 5. フローチャート（支払い処理）
```mermaid
flowchart TD
    A[開始] --> B{プラン選択}
    B -->|Basic| C[Basic金額設定]
    B -->|Pro| D[Pro金額設定]
    C --> E[チェックアウト作成]
    D --> E
    E --> F{支払い処理}
    F -->|成功| G[サブスクリプション作成]
    F -->|失敗| H[エラー処理]
    G --> I[完了]
    H --> J[再試行]
```

## 6. クラス図
```mermaid
classDiagram
    class User {
        +id: number
        +email: string
        +name: string
        +role: string
        +createTeam()
        +updateProfile()
    }

    class Team {
        +id: number
        +name: string
        +stripeCustomerId: string
        +addMember()
        +removeMember()
    }

    class Subscription {
        +id: string
        +status: string
        +currentPeriodEnd: date
        +cancel()
        +upgrade()
    }

    User "1" -- "*" Team : belongs to
    Team "1" -- "1" Subscription : has
```

## 7. インフラストラクチャ図
```mermaid
graph TB
    subgraph Production
        LB[Load Balancer]
        App1[App Server 1]
        App2[App Server 2]
        DB[(PostgreSQL)]
        Redis[(Redis)]
    end

    subgraph External Services
        Stripe[Stripe API]
        Email[Email Service]
    end

    Client --> LB
    LB --> App1
    LB --> App2
    App1 --> DB
    App2 --> DB
    App1 --> Redis
    App2 --> Redis
    App1 --> Stripe
    App2 --> Stripe
    App1 --> Email
    App2 --> Email
```

## 8. ワイヤーフレーム
```mermaid
graph TD
    subgraph Dashboard
        Header[ヘッダー: ロゴ・ナビゲーション]
        Sidebar[サイドバー: メニュー]
        Content[メインコンテンツ]
        subgraph Content
            Stats[統計情報]
            Activity[アクティビティログ]
            Settings[設定パネル]
        end
    end

    Header --- Sidebar
    Sidebar --- Content
    Content --- Stats
    Content --- Activity
    Content --- Settings
```

これらの図解は、アプリケーションの以下の側面を視覚化しています：

1. **シーケンス図**: ユーザー認証とサブスクリプションの処理フロー
2. **コンポーネント図**: アプリケーションの主要構成要素と依存関係
3. **ユースケース図**: システム機能とユーザーの関係
4. **状態遷移図**: サブスクリプションの状態変化
5. **フローチャート**: 支払い処理の具体的な流れ
6. **クラス図**: 主要なモデル間の関係
7. **インフラストラクチャ図**: 本番環境のシステム構成
8. **ワイヤーフレーム**: ダッシュボードのUI構造

これらの図解は、開発チームやステークホルダーがシステムの全体像を理解するのに役立ちます。
