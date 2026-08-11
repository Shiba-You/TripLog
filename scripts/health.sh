#!/usr/bin/env bash
# 各コンテナのヘルスチェックを行う。
# db / minio は docker compose のヘルスチェック結果、api / web はHTTPアクセスで確認する。
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-5173}"

overall=0

check_compose_health() {
  local service="$1"
  local health
  health="$(docker compose ps --format '{{.Health}}' "$service" 2>/dev/null)"
  if [ "$health" = "healthy" ]; then
    echo "[OK] $service (healthcheck: healthy)"
  else
    echo "[NG] $service (healthcheck: ${health:-not running})"
    overall=1
  fi
}

check_http() {
  local name="$1" url="$2"
  if curl -fsS --max-time 5 "$url" > /dev/null; then
    echo "[OK] $name ($url)"
  else
    echo "[NG] $name ($url)"
    overall=1
  fi
}

check_compose_health db
check_compose_health minio
check_http "api /health" "http://localhost:${API_PORT}/health"
check_http "web" "http://localhost:${WEB_PORT}/"

exit "$overall"
