#!/bin/bash

# デプロイロールバックスクリプト
# 
# 使用方法:
#   ./rollback.sh <環境> <前回のデプロイID>
#
# 例:
#   ./rollback.sh production dpl_abc123xyz

# 引数の確認
if [ $# -lt 2 ]; then
  echo "エラー: 引数が不足しています"
  echo "使用方法: $0 <環境> <前回のデプロイID>"
  exit 1
fi

ENVIRONMENT=$1
PREVIOUS_DEPLOYMENT_ID=$2

# 結果を保存するディレクトリ
RESULTS_DIR="deploy-checks"
mkdir -p $RESULTS_DIR

# タイムスタンプ
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOGFILE="$RESULTS_DIR/${ENVIRONMENT}_rollback_${TIMESTAMP}.log"

# ログ出力関数
log() {
  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" | tee -a $LOGFILE
}

# エラーハンドリング
handle_error() {
  log "エラー: $1"
  log "ロールバックに失敗しました。手動での対応が必要です。"
  exit 1
}

# 環境変数の確認
if [ -z "$VERCEL_TOKEN" ]; then
  handle_error "VERCEL_TOKEN 環境変数が設定されていません"
fi

if [ -z "$VERCEL_ORG_ID" ]; then
  handle_error "VERCEL_ORG_ID 環境変数が設定されていません"
fi

# 環境に応じたプロジェクトIDの設定
if [ "$ENVIRONMENT" = "production" ]; then
  if [ -z "$VERCEL_PROJECT_ID_PRODUCTION" ]; then
    handle_error "VERCEL_PROJECT_ID_PRODUCTION 環境変数が設定されていません"
  fi
  PROJECT_ID=$VERCEL_PROJECT_ID_PRODUCTION
  DEPLOY_URL="https://ppttranslatorapp.vercel.app"
elif [ "$ENVIRONMENT" = "staging" ]; then
  if [ -z "$VERCEL_PROJECT_ID" ]; then
    handle_error "VERCEL_PROJECT_ID 環境変数が設定されていません"
  fi
  PROJECT_ID=$VERCEL_PROJECT_ID
  DEPLOY_URL="https://ppttranslatorapp-staging.vercel.app"
else
  handle_error "不明な環境: $ENVIRONMENT"
fi

# メインの処理
log "==== ロールバック開始: $ENVIRONMENT (デプロイID: $PREVIOUS_DEPLOYMENT_ID) ===="

# 前回のデプロイが存在するか確認
log "前回のデプロイを確認しています..."
DEPLOYMENT_CHECK=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v13/deployments/$PREVIOUS_DEPLOYMENT_ID?teamId=$VERCEL_ORG_ID")

if [[ $DEPLOYMENT_CHECK == *"error"* ]]; then
  handle_error "指定されたデプロイIDが見つかりません: $PREVIOUS_DEPLOYMENT_ID"
fi

# ロールバックの実行
log "ロールバックを実行しています..."
ROLLBACK_RESULT=$(curl -s -X POST \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"deploymentId\":\"$PREVIOUS_DEPLOYMENT_ID\"}" \
  "https://api.vercel.com/v13/projects/$PROJECT_ID/promote?teamId=$VERCEL_ORG_ID")

if [[ $ROLLBACK_RESULT == *"error"* ]]; then
  handle_error "ロールバックに失敗しました: $ROLLBACK_RESULT"
fi

log "ロールバックが正常に実行されました"

# ロールバック後の健全性チェック
log "ロールバック後の健全性チェックを実行しています..."

# スクリプトのディレクトリを取得
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# 健全性チェックスクリプトを実行
$SCRIPT_DIR/health-check.sh post $ENVIRONMENT $DEPLOY_URL

if [ $? -ne 0 ]; then
  log "警告: ロールバック後の健全性チェックに問題があります。手動での確認が必要です。"
else
  log "ロールバック後の健全性チェックが正常に完了しました"
fi

# Slack通知（環境変数が設定されている場合）
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
  log "Slackに通知を送信しています..."
  
  curl -s -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🔄 *$ENVIRONMENT環境へのロールバックが完了しました*\n- デプロイID: $PREVIOUS_DEPLOYMENT_ID\n- URL: $DEPLOY_URL\"}" \
    $SLACK_WEBHOOK_URL
    
  log "Slack通知を送信しました"
fi

log "==== ロールバック終了: $ENVIRONMENT (デプロイID: $PREVIOUS_DEPLOYMENT_ID) ===="

exit 0
