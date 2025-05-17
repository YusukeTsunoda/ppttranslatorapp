#!/bin/bash

# モニタリングシステム検証スクリプト
# 使用方法: ./scripts/monitoring/verify-monitoring.sh [環境]
# 環境: staging, production (デフォルト: staging)

set -e

# 色の定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 引数の解析
ENVIRONMENT=${1:-staging}

# 環境に応じたURLの設定
if [ "$ENVIRONMENT" == "production" ]; then
  BASE_URL="https://pptxtranslator.com"
  DASHBOARD_URL="https://pptxtranslator.com/admin/dashboard"
elif [ "$ENVIRONMENT" == "staging" ]; then
  BASE_URL="https://staging.pptxtranslator.com"
  DASHBOARD_URL="https://staging.pptxtranslator.com/admin/dashboard"
else
  log_error "不明な環境: $ENVIRONMENT"
  log "使用方法: ./scripts/monitoring/verify-monitoring.sh [staging|production]"
  exit 1
fi

# プロジェクトルートに移動
PROJECT_ROOT=$(git rev-parse --show-toplevel)
cd "$PROJECT_ROOT"

log "モニタリングシステムの検証を開始します（環境: $ENVIRONMENT）..."

# ヘルスチェックエンドポイントの検証
verify_health_endpoint() {
  log "ヘルスチェックエンドポイントを検証しています..."
  HEALTH_URL="${BASE_URL}/api/health"
  
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
  
  if [ "$RESPONSE" == "200" ]; then
    log_success "ヘルスチェックエンドポイントが正常に応答しています"
    return 0
  else
    log_error "ヘルスチェックエンドポイントの応答が異常です: $RESPONSE"
    return 1
  fi
}

# Sentryの設定検証
verify_sentry() {
  log "Sentryの設定を検証しています..."
  
  if [ -z "$SENTRY_AUTH_TOKEN" ] || [ -z "$SENTRY_ORG" ] || [ -z "$SENTRY_PROJECT" ]; then
    log_error "Sentryの環境変数が設定されていません"
    return 1
  fi
  
  # Sentryプロジェクトの存在確認
  PROJECT_CHECK=$(npx @sentry/cli projects list --json | grep -c "\"$SENTRY_PROJECT\"")
  
  if [ "$PROJECT_CHECK" -gt 0 ]; then
    log_success "Sentryプロジェクトが正しく設定されています"
    
    # Sentryイベントの確認
    EVENTS_COUNT=$(node scripts/monitoring/get-sentry-errors.js --count-only)
    log "Sentryに記録されたイベント数: $EVENTS_COUNT"
    
    return 0
  else
    log_error "Sentryプロジェクトが見つかりません"
    return 1
  fi
}

# アラート設定の検証
verify_alerts() {
  log "アラート設定を検証しています..."
  
  if [ -z "$SLACK_WEBHOOK_URL" ]; then
    log_error "Slackウェブフックの環境変数が設定されていません"
    return 1
  fi
  
  # テストアラートの送信
  TEST_ALERT_RESULT=$(node scripts/monitoring/setup-alerts.js --test-alert)
  
  if [[ $TEST_ALERT_RESULT == *"成功"* ]]; then
    log_success "アラートシステムが正しく設定されています"
    return 0
  else
    log_error "アラートシステムの設定に問題があります"
    return 1
  fi
}

# パフォーマンスモニタリングの検証
verify_performance_monitoring() {
  log "パフォーマンスモニタリングを検証しています..."
  
  # Lighthouseレポートの生成
  LIGHTHOUSE_RESULT=$(npx lighthouse $BASE_URL --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless --no-sandbox" --quiet)
  
  if [ -f "./lighthouse-report.json" ]; then
    PERFORMANCE_SCORE=$(cat ./lighthouse-report.json | grep -o '"performance":[0-9.]*' | cut -d':' -f2)
    log "パフォーマンススコア: $PERFORMANCE_SCORE"
    
    # レポートの削除
    rm ./lighthouse-report.json
    
    log_success "パフォーマンスモニタリングが正しく設定されています"
    return 0
  else
    log_error "Lighthouseレポートの生成に失敗しました"
    return 1
  fi
}

# ダッシュボードの検証
verify_dashboard() {
  log "ダッシュボードを検証しています..."
  
  # ダッシュボードの存在確認
  DASHBOARD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $DASHBOARD_URL)
  
  if [ "$DASHBOARD_RESPONSE" == "200" ]; then
    log_success "ダッシュボードが正常に応答しています"
    return 0
  else
    log_error "ダッシュボードの応答が異常です: $DASHBOARD_RESPONSE"
    return 1
  fi
}

# 検証の実行
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# ヘルスチェック
verify_health_endpoint
HEALTH_RESULT=$?
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ $HEALTH_RESULT -eq 0 ]; then
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Sentry検証
verify_sentry
SENTRY_RESULT=$?
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ $SENTRY_RESULT -eq 0 ]; then
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# アラート検証
verify_alerts
ALERTS_RESULT=$?
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ $ALERTS_RESULT -eq 0 ]; then
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# パフォーマンスモニタリング検証
verify_performance_monitoring
PERFORMANCE_RESULT=$?
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ $PERFORMANCE_RESULT -eq 0 ]; then
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# ダッシュボード検証
verify_dashboard
DASHBOARD_RESULT=$?
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ $DASHBOARD_RESULT -eq 0 ]; then
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 検証結果のサマリー
log "モニタリングシステム検証サマリー:"
log "  合計チェック数: $TOTAL_CHECKS"
log_success "  成功: $PASSED_CHECKS"
if [ $FAILED_CHECKS -gt 0 ]; then
  log_error "  失敗: $FAILED_CHECKS"
  exit 1
else
  log_success "すべてのモニタリングシステムが正常に設定されています！"
  exit 0
fi
