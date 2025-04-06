#!/bin/bash

# 本番環境動作確認スクリプト
# 使用方法: ./verify-production.sh [環境URL] [オプション]
# 例: ./verify-production.sh https://example.com
# オプション:
#   --skip-db: データベース接続チェックをスキップ

# 色の設定
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ヘッダー出力関数
print_header() {
  echo -e "\n${YELLOW}==== $1 ====${NC}\n"
}

# 成功メッセージ出力関数
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# 警告メッセージ出力関数
print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# エラーメッセージ出力関数
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# 引数からベースURLを取得、なければデフォルト値を使用
BASE_URL=${1:-"http://localhost:3000"}

# オプションの処理
SKIP_DB=false
if [[ "$2" == "--skip-db" ]]; then
  SKIP_DB=true
fi

print_header "本番環境動作確認スクリプト"
echo "対象環境: $BASE_URL"
echo "実行日時: $(date)"
if [[ "$SKIP_DB" == "true" ]]; then
  echo "オプション: データベース接続チェックをスキップ"
fi
echo "-------------------------------------"

# ヘルスチェックエンドポイントの確認
print_header "ヘルスチェックの実行"
HEALTH_URL="$BASE_URL/api/health"
if [[ "$SKIP_DB" == "true" ]]; then
  HEALTH_URL="${HEALTH_URL}?skip_db=true"
fi
echo "ヘルスチェックURL: $HEALTH_URL"

# ヘルスチェックエンドポイントにリクエスト
RESPONSE=$(curl -s -w "\n%{http_code}" $HEALTH_URL)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# ステータスコードを確認
if [[ $HTTP_STATUS -ge 200 && $HTTP_STATUS -lt 300 ]]; then
  print_success "ヘルスチェック成功: HTTP $HTTP_STATUS"
else
  print_error "ヘルスチェック失敗: HTTP $HTTP_STATUS"
  echo "レスポンス: $BODY"
  exit 1
fi

# レスポンスの内容を確認
OVERALL_STATUS=$(echo "$BODY" | jq -r '.status')
echo "全体ステータス: $OVERALL_STATUS"

# 各コンポーネントのステータスを確認
AUTH_STATUS=$(echo "$BODY" | jq -r '.components.auth.status')
DB_STATUS=$(echo "$BODY" | jq -r '.components.database.status')
ERROR_HANDLING_STATUS=$(echo "$BODY" | jq -r '.components.errorHandling.status')

echo "認証ステータス: $AUTH_STATUS"
if [[ "$SKIP_DB" == "false" ]]; then
  echo "データベースステータス: $DB_STATUS"
fi
echo "エラーハンドリングステータス: $ERROR_HANDLING_STATUS"

# 詳細情報を表示
echo -e "\n詳細情報:"
echo "$BODY" | jq '.'

# 認証エンドポイントの確認
print_header "認証機能の確認"
AUTH_URL="$BASE_URL/api/auth/session"
echo "認証チェックURL: $AUTH_URL"

# セッションエンドポイントにリクエスト
RESPONSE=$(curl -s -w "\n%{http_code}" $AUTH_URL)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# ステータスコードを確認（未認証なので200または401が正常）
if [[ $HTTP_STATUS -eq 200 || $HTTP_STATUS -eq 401 ]]; then
  print_success "認証エンドポイント確認成功: HTTP $HTTP_STATUS"
else
  print_error "認証エンドポイント確認失敗: HTTP $HTTP_STATUS"
  echo "レスポンス: $BODY"
  exit 1
fi

echo "レスポンス: $BODY"

# エラーハンドリングの確認（存在しないエンドポイントにアクセス）
print_header "エラーハンドリングの確認"
ERROR_URL="$BASE_URL/api/non-existent-endpoint"
echo "存在しないエンドポイント: $ERROR_URL"

# 存在しないエンドポイントにリクエスト
RESPONSE=$(curl -s -w "\n%{http_code}" $ERROR_URL)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# ステータスコードを確認（404が期待される）
if [[ $HTTP_STATUS -eq 404 ]]; then
  print_success "エラーハンドリング確認成功: HTTP $HTTP_STATUS"
else
  print_warning "エラーハンドリング確認結果が予期しないものです: HTTP $HTTP_STATUS"
fi

echo "レスポンス: $BODY"

# 総合結果
print_header "総合結果"
if [[ "$OVERALL_STATUS" == "ok" ]]; then
  print_success "本番環境は正常に動作しています"
  exit 0
elif [[ "$OVERALL_STATUS" == "warning" ]]; then
  print_warning "本番環境は警告付きで動作しています"
  exit 0
else
  print_error "本番環境に問題があります"
  exit 1
fi
