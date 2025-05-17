# メンテナンス手順

## 1. 定期メンテナンス

### 1.1 システムアップデート

#### セキュリティパッチ適用
1. 更新内容の確認
   ```bash
   npm audit
   ```

2. 脆弱性の修正
   ```bash
   npm audit fix
   ```

3. パッケージの更新
   ```bash
   npm update
   npm outdated
   ```

#### ライブラリアップデート
1. 依存関係の確認
   ```bash
   npm list
   ```

2. メジャーバージョンアップデート
   ```bash
   npm install <package>@latest
   ```

3. テストの実行
   ```bash
   npm run test
   ```

#### OS更新
1. システムパッケージの更新
   ```bash
   sudo apt update
   sudo apt upgrade
   ```

2. 再起動が必要な場合
   ```bash
   sudo needrestart
   ```

### 1.2 パフォーマンスチューニング

#### データベース最適化
1. インデックスの再構築
   ```sql
   REINDEX DATABASE ppttranslator;
   ```

2. 不要なデータの削除
   ```sql
   DELETE FROM translation_history WHERE created_at < NOW() - INTERVAL '1 year';
   ```

3. バキューム処理
   ```sql
   VACUUM ANALYZE;
   ```

#### キャッシュクリア
1. アプリケーションキャッシュのクリア
   ```bash
   npm run clear-cache
   ```

2. CDNキャッシュの更新
   ```bash
   curl -X PURGE https://your-cdn-url/*
   ```

#### ログローテーション
1. ログファイルの圧縮
   ```bash
   gzip /var/log/ppttranslator/*.log
   ```

2. 古いログの削除
   ```bash
   find /var/log/ppttranslator -name "*.gz" -mtime +30 -delete
   ```

## 2. 緊急メンテナンス

### 2.1 障害対応
1. サービス状態の確認
   ```bash
   systemctl status ppttranslator
   ```

2. エラーログの確認
   ```bash
   tail -f /var/log/ppttranslator/error.log
   ```

3. プロセスの再起動
   ```bash
   systemctl restart ppttranslator
   ```

### 2.2 セキュリティインシデント対応
1. 不正アクセスの遮断
   ```bash
   ufw deny from <ip-address>
   ```

2. セッションの強制終了
   ```sql
   DELETE FROM sessions WHERE suspicious = true;
   ```

3. ログの保全
   ```bash
   cp /var/log/ppttranslator/access.log /var/log/archive/
   ```

### 2.3 パフォーマンス問題対応
1. リソース使用状況の確認
   ```bash
   top
   htop
   ```

2. スロークエリの特定
   ```sql
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

3. 接続数の制限
   ```bash
   systemctl edit ppttranslator
   # MaxConnections=100 を設定
   ```

## 3. メンテナンス通知

### 3.1 ユーザーへの事前通知
1. メンテナンス情報の作成
   - 日時
   - 影響範囲
   - 予想される停止時間
   - 代替手段（必要な場合）

2. 通知の送信
   ```bash
   npm run notify-maintenance
   ```

### 3.2 影響範囲の告知
1. 影響を受けるサービス
   - 翻訳機能
   - ファイルアップロード
   - ユーザー認証

2. 影響を受けるユーザー
   - 全ユーザー
   - 特定のユーザーグループ
   - 特定の地域のユーザー

### 3.3 完了報告
1. メンテナンス結果の確認
   - 実施した作業の確認
   - 影響範囲の確認
   - パフォーマンスの確認

2. 完了通知の送信
   ```bash
   npm run notify-maintenance-complete
   ```

## 4. メンテナンスチェックリスト

### 4.1 事前確認
- [ ] バックアップの実行
- [ ] テスト環境での検証
- [ ] 必要なリソースの確保
- [ ] 関係者への通知

### 4.2 実施中
- [ ] システムの状態監視
- [ ] エラーログの監視
- [ ] パフォーマンスの監視
- [ ] ユーザー影響の確認

### 4.3 事後確認
- [ ] サービスの正常動作確認
- [ ] パフォーマンスの確認
- [ ] ログの確認
- [ ] バックアップの確認

## 5. 定期メンテナンススケジュール

### 5.1 日次メンテナンス
- ログの確認
- バックアップの確認
- エラー率の確認

### 5.2 週次メンテナンス
- パフォーマンス分析
- セキュリティチェック
- ディスク使用量の確認

### 5.3 月次メンテナンス
- セキュリティパッチの適用
- システムアップデート
- 大規模なデータクリーンアップ

### 5.4 四半期メンテナンス
- 大規模なシステムアップデート
- パフォーマンスチューニング
- セキュリティ監査 