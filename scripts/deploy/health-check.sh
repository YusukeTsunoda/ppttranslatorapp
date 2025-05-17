#!/bin/bash

# デプロイ前後の健全性チェックスクリプト
# 
# 使用方法:
#   ./health-check.sh pre|post <環境> <デプロイURL>
#
# 例:
#   ./health-check.sh pre staging https://ppttranslatorapp-staging.vercel.app
#   ./health-check.sh post production https://ppttranslatorapp.vercel.app

# 引数の確認
if [ $# -lt 3 ]; then
  echo "エラー: 引数が不足しています"
  echo "使用方法: $0 pre|post <環境> <デプロイURL>"
  exit 1
fi

CHECK_TYPE=$1  # pre または post
ENVIRONMENT=$2  # staging または production
DEPLOY_URL=$3

# 結果を保存するディレクトリ
RESULTS_DIR="deploy-checks"
mkdir -p $RESULTS_DIR

# タイムスタンプ
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOGFILE="$RESULTS_DIR/${ENVIRONMENT}_${CHECK_TYPE}_${TIMESTAMP}.log"

# ログ出力関数
log() {
  echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" | tee -a $LOGFILE
}

# エラーハンドリング
handle_error() {
  log "エラー: $1"
  if [ "$CHECK_TYPE" = "pre" ]; then
    log "デプロイ前チェックに失敗しました。デプロイを中止します。"
    exit 1
  elif [ "$CHECK_TYPE" = "post" ]; then
    log "デプロイ後チェックに失敗しました。ロールバックを検討してください。"
    exit 1
  fi
}

# ヘルスチェックエンドポイントの確認
check_health_endpoint() {
  log "ヘルスチェックエンドポイントを確認しています..."
  HEALTH_URL="${DEPLOY_URL}/api/health"
  
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
  if [ "$RESPONSE" = "200" ]; then
    log "ヘルスチェックエンドポイントは正常に応答しています (200 OK)"
  else
    handle_error "ヘルスチェックエンドポイントが異常です (HTTP $RESPONSE)"
  fi
}

# 基本的なページの確認
check_basic_pages() {
  log "基本的なページを確認しています..."
  PAGES=("/" "/translate" "/api/health")
  
  for PAGE in "${PAGES[@]}"; do
    URL="${DEPLOY_URL}${PAGE}"
    log "ページを確認中: $URL"
    
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "302" ]; then
      log "ページは正常に応答しています: $URL (HTTP $RESPONSE)"
    else
      handle_error "ページが異常です: $URL (HTTP $RESPONSE)"
    fi
  done
}

# APIエンドポイントの確認
check_api_endpoints() {
  log "APIエンドポイントを確認しています..."
  
  # ヘルスチェックAPIの詳細確認
  HEALTH_URL="${DEPLOY_URL}/api/health"
  HEALTH_RESPONSE=$(curl -s $HEALTH_URL)
  
  if [[ $HEALTH_RESPONSE == *"status"*:"ok"* ]]; then
    log "ヘルスチェックAPIは正常に応答しています"
  else
    handle_error "ヘルスチェックAPIが異常なレスポンスを返しています: $HEALTH_RESPONSE"
  fi
}

# パフォーマンスチェック
check_performance() {
  log "パフォーマンスを確認しています..."
  
  # 応答時間の測定
  RESPONSE_TIME=$(curl -s -w "%{time_total}\n" -o /dev/null $DEPLOY_URL)
  log "トップページの応答時間: ${RESPONSE_TIME}秒"
  
  # 応答時間が閾値を超えた場合は警告
  if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
    log "警告: 応答時間が遅いです (${RESPONSE_TIME}秒 > 2.0秒)"
  fi
}

# メインの処理
log "==== デプロイ${CHECK_TYPE}チェック開始: $ENVIRONMENT ($DEPLOY_URL) ===="

# デプロイ前チェック
if [ "$CHECK_TYPE" = "pre" ]; then
  log "デプロイ前チェックを実行しています..."
  # 現在の本番環境の状態を確認
  check_health_endpoint
  check_basic_pages
  
  log "デプロイ前チェックが完了しました"

# デプロイ後チェック
elif [ "$CHECK_TYPE" = "post" ]; then
  log "デプロイ後チェックを実行しています..."
  
  # デプロイ直後は少し待機（サービスが起動するまで）
  log "サービスの起動を待機しています (30秒)..."
  sleep 30
  
  # 各種チェックを実行
  check_health_endpoint
  check_basic_pages
  check_api_endpoints
  check_performance
  
  log "デプロイ後チェックが完了しました"
else
  handle_error "不明なチェックタイプ: $CHECK_TYPE"
fi

log "==== デプロイ${CHECK_TYPE}チェック終了: $ENVIRONMENT ($DEPLOY_URL) ===="

exit 0
