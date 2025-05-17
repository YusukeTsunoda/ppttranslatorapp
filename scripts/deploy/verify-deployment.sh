#!/bin/bash

# デプロイメントプロセス検証スクリプト
# 使用方法: ./scripts/deploy/verify-deployment.sh [環境]
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

# 環境に応じた設定
if [ "$ENVIRONMENT" == "production" ]; then
  DEPLOY_URL="https://pptxtranslator.com"
  PROJECT_ID=$VERCEL_PROJECT_ID_PRODUCTION
elif [ "$ENVIRONMENT" == "staging" ]; then
  DEPLOY_URL="https://staging.pptxtranslator.com"
  PROJECT_ID=$VERCEL_PROJECT_ID
else
  log_error "不明な環境: $ENVIRONMENT"
  log "使用方法: ./scripts/deploy/verify-deployment.sh [staging|production]"
  exit 1
fi

# 必要な環境変数のチェック
if [ -z "$VERCEL_TOKEN" ] || [ -z "$VERCEL_ORG_ID" ] || [ -z "$PROJECT_ID" ]; then
  log_error "必要な環境変数が設定されていません"
  log "VERCEL_TOKEN, VERCEL_ORG_ID, PROJECT_ID（環境に応じたもの）が必要です"
  exit 1
fi

# プロジェクトルートに移動
PROJECT_ROOT=$(git rev-parse --show-toplevel)
cd "$PROJECT_ROOT"

log "デプロイメントプロセスの検証を開始します（環境: $ENVIRONMENT）..."

# 最新のデプロイメント情報を取得
get_latest_deployment() {
  log "最新のデプロイメント情報を取得しています..."
  
  DEPLOYMENTS=$(curl -s \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v6/deployments?teamId=$VERCEL_ORG_ID&projectId=$PROJECT_ID&limit=1")
  
  LATEST_DEPLOYMENT_ID=$(echo $DEPLOYMENTS | grep -o '"uid":"[^"]*"' | head -1 | cut -d'"' -f4)
  LATEST_DEPLOYMENT_STATE=$(echo $DEPLOYMENTS | grep -o '"state":"[^"]*"' | head -1 | cut -d'"' -f4)
  LATEST_DEPLOYMENT_URL=$(echo $DEPLOYMENTS | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$LATEST_DEPLOYMENT_ID" ]; then
    log_error "デプロイメント情報の取得に失敗しました"
    return 1
  fi
  
  log "最新のデプロイメントID: $LATEST_DEPLOYMENT_ID"
  log "デプロイメント状態: $LATEST_DEPLOYMENT_STATE"
  log "デプロイメントURL: $LATEST_DEPLOYMENT_URL"
  
  if [ "$LATEST_DEPLOYMENT_STATE" == "READY" ]; then
    log_success "最新のデプロイメントは正常に完了しています"
    return 0
  else
    log_error "最新のデプロイメントの状態が異常です: $LATEST_DEPLOYMENT_STATE"
    return 1
  fi
}

# ヘルスチェックの実行
perform_health_check() {
  log "ヘルスチェックを実行しています..."
  
  # ヘルスチェックスクリプトを実行
  ./scripts/deploy/health-check.sh "$DEPLOY_URL"
  HEALTH_CHECK_RESULT=$?
  
  if [ $HEALTH_CHECK_RESULT -eq 0 ]; then
    log_success "ヘルスチェックが正常に完了しました"
    return 0
  else
    log_error "ヘルスチェックに失敗しました"
    return 1
  fi
}

# ロールバック機能の検証
verify_rollback() {
  log "ロールバック機能を検証しています..."
  
  # 前回のデプロイメントIDを取得
  DEPLOYMENTS=$(curl -s \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v6/deployments?teamId=$VERCEL_ORG_ID&projectId=$PROJECT_ID&limit=2")
  
  DEPLOYMENT_IDS=($(echo $DEPLOYMENTS | grep -o '"uid":"[^"]*"' | cut -d'"' -f4))
  
  if [ ${#DEPLOYMENT_IDS[@]} -lt 2 ]; then
    log_warning "ロールバックをテストするための十分なデプロイメント履歴がありません"
    return 0
  fi
  
  CURRENT_DEPLOYMENT_ID=${DEPLOYMENT_IDS[0]}
  PREVIOUS_DEPLOYMENT_ID=${DEPLOYMENT_IDS[1]}
  
  log "現在のデプロイメントID: $CURRENT_DEPLOYMENT_ID"
  log "前回のデプロイメントID: $PREVIOUS_DEPLOYMENT_ID"
  
  # ロールバックスクリプトのドライラン
  ROLLBACK_TEST=$(VERCEL_TOKEN=$VERCEL_TOKEN VERCEL_ORG_ID=$VERCEL_ORG_ID PROJECT_ID=$PROJECT_ID PREVIOUS_DEPLOYMENT_ID=$PREVIOUS_DEPLOYMENT_ID ./scripts/deploy/rollback.sh --dry-run)
  
  if [[ $ROLLBACK_TEST == *"ロールバックの準備ができています"* ]]; then
    log_success "ロールバック機能が正常に動作しています"
    return 0
  else
    log_error "ロールバック機能の検証に失敗しました"
    return 1
  fi
}

# デプロイメントパイプラインの検証
verify_deployment_pipeline() {
  log "デプロイメントパイプラインを検証しています..."
  
  # GitHub Actionsのワークフローの状態を確認
  if [ -z "$GITHUB_TOKEN" ]; then
    log_warning "GITHUB_TOKENが設定されていないため、ワークフロー状態の確認をスキップします"
    return 0
  fi
  
  REPO_OWNER="YusukeTsunoda"
  REPO_NAME="ppttranslatorapp"
  WORKFLOW_ID="cd.yml"
  
  WORKFLOW_RUNS=$(curl -s \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/actions/workflows/$WORKFLOW_ID/runs?per_page=1")
  
  LATEST_RUN_STATUS=$(echo $WORKFLOW_RUNS | grep -o '"conclusion":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ "$LATEST_RUN_STATUS" == "success" ]; then
    log_success "最新のデプロイメントワークフローは正常に完了しています"
    return 0
  else
    log_error "最新のデプロイメントワークフローの状態が異常です: $LATEST_RUN_STATUS"
    return 1
  fi
}

# 検証の実行
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 最新のデプロイメント情報
get_latest_deployment
DEPLOYMENT_RESULT=$?
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ $DEPLOYMENT_RESULT -eq 0 ]; then
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# ヘルスチェック
perform_health_check
HEALTH_RESULT=$?
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ $HEALTH_RESULT -eq 0 ]; then
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# ロールバック機能
verify_rollback
ROLLBACK_RESULT=$?
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ $ROLLBACK_RESULT -eq 0 ]; then
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# デプロイメントパイプライン
verify_deployment_pipeline
PIPELINE_RESULT=$?
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ $PIPELINE_RESULT -eq 0 ]; then
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 検証結果のサマリー
log "デプロイメントプロセス検証サマリー:"
log "  合計チェック数: $TOTAL_CHECKS"
log_success "  成功: $PASSED_CHECKS"
if [ $FAILED_CHECKS -gt 0 ]; then
  log_error "  失敗: $FAILED_CHECKS"
  exit 1
else
  log_success "デプロイメントプロセスが正常に機能しています！"
  exit 0
fi
