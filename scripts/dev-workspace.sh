#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PID=""
WEB_PID=""

cleanup() {
  if [[ -n "${API_PID}" ]] && kill -0 "${API_PID}" 2>/dev/null; then
    kill "${API_PID}" 2>/dev/null || true
  fi

  if [[ -n "${WEB_PID}" ]] && kill -0 "${WEB_PID}" 2>/dev/null; then
    kill "${WEB_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

(
  cd "${ROOT_DIR}"
  bun run dev:api
) &
API_PID=$!

(
  cd "${ROOT_DIR}"
  bun run dev:web
) &
WEB_PID=$!

wait -n "${API_PID}" "${WEB_PID}"
