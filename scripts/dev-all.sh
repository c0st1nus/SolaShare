#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export SOLASHARE_API_URL="${SOLASHARE_API_URL:-http://localhost:3000}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:3001,http://127.0.0.1:3001}"

backend_pid=""

cleanup() {
  local exit_code=$?

  if [[ -n "${backend_pid}" ]] && kill -0 "${backend_pid}" 2>/dev/null; then
    kill "${backend_pid}" 2>/dev/null || true
    wait "${backend_pid}" 2>/dev/null || true
  fi

  exit "${exit_code}"
}

trap cleanup INT TERM EXIT

cd "${ROOT_DIR}"

echo "Starting backend with CORS_ORIGINS=${CORS_ORIGINS}"
bun run dev:backend &
backend_pid=$!

echo "Starting frontend with SOLASHARE_API_URL=${SOLASHARE_API_URL}"
bun run dev:frontend
