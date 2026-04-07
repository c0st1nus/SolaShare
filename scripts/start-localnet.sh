#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="${ROOT_DIR}/.solana"
LEDGER_DIR="${STATE_DIR}/test-ledger"
PID_FILE="${STATE_DIR}/validator.pid"
LOG_FILE="${STATE_DIR}/validator.log"
PROGRAM_WORKSPACE_DIR="${ROOT_DIR}/programs/solashare-protocol"
PROGRAM_SO="${PROGRAM_WORKSPACE_DIR}/target/deploy/solashare_protocol.so"
PROGRAM_KEYPAIR="${PROGRAM_WORKSPACE_DIR}/target/deploy/solashare_protocol-keypair.json"
RPC_PORT="${RPC_PORT:-8899}"
FAUCET_PORT="${FAUCET_PORT:-9900}"
HOST="${HOST:-127.0.0.1}"
RESET_LEDGER=0
BUILD_PROGRAM=0

print_usage() {
  cat <<'EOF'
Usage: ./scripts/start-localnet.sh [--reset] [--build]

Options:
  --reset   Remove the existing local validator ledger before startup.
  --build   Rebuild the Solana program before startup when a local builder is available.
EOF
}

while (($# > 0)); do
  case "$1" in
    --reset)
      RESET_LEDGER=1
      ;;
    --build)
      BUILD_PROGRAM=1
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      print_usage >&2
      exit 1
      ;;
  esac
  shift
done

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

is_running() {
  [[ -f "${PID_FILE}" ]] || return 1

  local pid
  pid="$(cat "${PID_FILE}")"

  [[ -n "${pid}" ]] || return 1
  kill -0 "${pid}" 2>/dev/null
}

build_program() {
  if command -v anchor >/dev/null 2>&1; then
    echo "Building Solana program with anchor build"
    (
      cd "${PROGRAM_WORKSPACE_DIR}"
      anchor build
    )
    return
  fi

  if command -v cargo-build-sbf >/dev/null 2>&1; then
      echo "Building Solana program with cargo-build-sbf"
    cargo-build-sbf \
      --manifest-path "${PROGRAM_WORKSPACE_DIR}/programs/solashare_protocol/Cargo.toml" \
      --sbf-out-dir "${PROGRAM_WORKSPACE_DIR}/target/deploy"
    return
  fi

  echo "Cannot build Solana program: neither anchor nor cargo-build-sbf is installed." >&2
  exit 1
}

wait_for_validator() {
  local rpc_url="http://${HOST}:${RPC_PORT}"

  for _ in {1..30}; do
    if solana cluster-version --url "${rpc_url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Local validator did not become ready. Check ${LOG_FILE}." >&2
  exit 1
}

require_command solana-test-validator
require_command solana

mkdir -p "${STATE_DIR}"

if is_running; then
  echo "Local validator is already running with PID $(cat "${PID_FILE}")."
  echo "RPC URL: http://${HOST}:${RPC_PORT}"
  exit 0
fi

if ((BUILD_PROGRAM == 1)); then
  build_program
fi

if ((RESET_LEDGER == 1)); then
  echo "Resetting local ledger at ${LEDGER_DIR}"
  rm -rf "${LEDGER_DIR}"
fi

program_args=()
if [[ -f "${PROGRAM_SO}" && -f "${PROGRAM_KEYPAIR}" ]]; then
  PROGRAM_ID="$(solana address -k "${PROGRAM_KEYPAIR}")"
  program_args+=(--bpf-program "${PROGRAM_ID}" "${PROGRAM_SO}")
  echo "Will load program ${PROGRAM_ID} from ${PROGRAM_SO}"
else
  echo "Program artifact not found, starting validator without preloaded program."
fi

echo "Starting solana-test-validator"
nohup solana-test-validator \
  --ledger "${LEDGER_DIR}" \
  --rpc-port "${RPC_PORT}" \
  --faucet-port "${FAUCET_PORT}" \
  "${program_args[@]}" \
  >"${LOG_FILE}" 2>&1 &

VALIDATOR_PID=$!
echo "${VALIDATOR_PID}" > "${PID_FILE}"

wait_for_validator

echo "Local validator started."
echo "PID: ${VALIDATOR_PID}"
echo "RPC URL: http://${HOST}:${RPC_PORT}"
echo "Log file: ${LOG_FILE}"
echo "Set CLI RPC with: solana config set --url http://${HOST}:${RPC_PORT}"
