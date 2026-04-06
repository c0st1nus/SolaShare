#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="${ROOT_DIR}/.solana"
PID_FILE="${STATE_DIR}/validator.pid"

if [[ ! -f "${PID_FILE}" ]]; then
  echo "No local validator PID file found at ${PID_FILE}."
  exit 0
fi

PID="$(cat "${PID_FILE}")"

if [[ -z "${PID}" ]]; then
  rm -f "${PID_FILE}"
  echo "Removed empty validator PID file."
  exit 0
fi

if kill -0 "${PID}" 2>/dev/null; then
  echo "Stopping local validator PID ${PID}"
  kill "${PID}"

  for _ in {1..15}; do
    if ! kill -0 "${PID}" 2>/dev/null; then
      break
    fi
    sleep 1
  done

  if kill -0 "${PID}" 2>/dev/null; then
    echo "Validator did not stop gracefully, sending SIGKILL"
    kill -9 "${PID}" 2>/dev/null || true
  fi
else
  echo "Validator PID ${PID} is not running."
fi

rm -f "${PID_FILE}"
echo "Local validator stopped."
