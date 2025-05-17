#!/bin/bash

# テスト実行スクリプト
# 使用方法: ./scripts/test/run-tests.sh [テストタイプ]
# テストタイプ: unit, integration, e2e, all (デフォルト: all)

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
TEST_TYPE=${1:-all}

# プロジェクトルートに移動
PROJECT_ROOT=$(git rev-parse --show-toplevel)
cd "$PROJECT_ROOT"

# 環境変数の設定
export NODE_ENV=test

# テスト実行前の準備
log "テスト環境を準備しています..."
npm ci --quiet

# テストカバレッジディレクトリの作成
mkdir -p coverage

# テスト実行関数
run_unit_tests() {
  log "単体テストを実行しています..."
  npm run test
  if [ $? -eq 0 ]; then
    log_success "単体テストが正常に完了しました"
    return 0
  else
    log_error "単体テストに失敗しました"
    return 1
  fi
}

run_integration_tests() {
  log "統合テストを実行しています..."
  npm run test:ci
  if [ $? -eq 0 ]; then
    log_success "統合テストが正常に完了しました"
    return 0
  else
    log_error "統合テストに失敗しました"
    return 1
  fi
}

run_e2e_tests() {
  log "E2Eテストを実行しています..."
  npm run test:e2e
  if [ $? -eq 0 ]; then
    log_success "E2Eテストが正常に完了しました"
    return 0
  else
    log_error "E2Eテストに失敗しました"
    return 1
  fi
}

# テスト結果の集計
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# テスト実行
case $TEST_TYPE in
  unit)
    run_unit_tests
    UNIT_RESULT=$?
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $UNIT_RESULT -eq 0 ]; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    ;;
  integration)
    run_integration_tests
    INT_RESULT=$?
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $INT_RESULT -eq 0 ]; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    ;;
  e2e)
    run_e2e_tests
    E2E_RESULT=$?
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $E2E_RESULT -eq 0 ]; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    ;;
  all)
    run_unit_tests
    UNIT_RESULT=$?
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $UNIT_RESULT -eq 0 ]; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    run_integration_tests
    INT_RESULT=$?
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $INT_RESULT -eq 0 ]; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    run_e2e_tests
    E2E_RESULT=$?
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $E2E_RESULT -eq 0 ]; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    ;;
  *)
    log_error "不明なテストタイプ: $TEST_TYPE"
    log "使用方法: ./scripts/test/run-tests.sh [unit|integration|e2e|all]"
    exit 1
    ;;
esac

# テスト結果のサマリー
log "テスト実行サマリー:"
log "  合計テスト数: $TOTAL_TESTS"
log_success "  成功: $PASSED_TESTS"
if [ $FAILED_TESTS -gt 0 ]; then
  log_error "  失敗: $FAILED_TESTS"
  exit 1
else
  log_success "すべてのテストが正常に完了しました！"
  exit 0
fi
