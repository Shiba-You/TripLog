#!/usr/bin/env bash
# ローカル開発用コンテナ（db / minio / api / web）を起動する。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo ".env が見つからないため .env.example からコピーします"
  cp .env.example .env
fi

docker compose up -d --build
docker compose ps
