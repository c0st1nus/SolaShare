#!/bin/bash
# Start full SolaShare stack: Surfpool + Backend + Frontend
set -e

BACKEND_DIR="/home/ali/SolaShare"
FRONTEND_DIR="/home/ali/solashare-frontend"
PROGRAM_ID="DtRpAZKe3D38mYFyLgGHsSs8gFDFtB4WKPsR1yz6gD5S"
RPC_URL="http://127.0.0.1:8899"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Starting SolaShare Full Stack"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Surfpool
echo ""
echo "[1/4] Checking Surfpool..."
if curl -s "$RPC_URL" -X POST -H "Content-Type: application/json" \
   -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' | grep -q "result"; then
  echo "  ✓ Surfpool is running at $RPC_URL"
else
  echo "  ✗ Surfpool not running. Start it with: surfpool"
  echo "  Waiting 5 seconds in case you want to start it..."
  sleep 5
fi

# Check program
echo ""
echo "[2/4] Checking Anchor program deployment..."
if solana program show "$PROGRAM_ID" --url "$RPC_URL" 2>/dev/null | grep -q "Program Id"; then
  echo "  ✓ Program $PROGRAM_ID is deployed"
else
  echo "  ✗ Program not deployed. Deploying..."
  cd "$BACKEND_DIR/solashare_program"
  solana program deploy target/deploy/solashare_program.so \
    --program-id target/deploy/solashare_program-keypair.json \
    --url "$RPC_URL" || echo "  Warning: Deploy failed (might already exist)"
fi

# Start backend
echo ""
echo "[3/4] Starting backend..."
cd "$BACKEND_DIR"
docker compose up -d postgres redis 2>/dev/null || true
export INDEXER_AUTO_START=true
bun run dev:backend &
BACKEND_PID=$!
sleep 3

# Test backend
if curl -s http://localhost:3000/api/v1/indexer/health | grep -q "healthy"; then
  echo "  ✓ Backend running at http://localhost:3000"
else
  echo "  ⚠ Backend may still be starting..."
fi

# Start frontend
echo ""
echo "[4/4] Starting frontend..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SolaShare is running!"
echo ""
echo "  Backend:         http://localhost:3000"
echo "  Frontend:        http://localhost:3001"
echo "  API Docs:        http://localhost:3000/openapi"
echo "  Indexer Health:  http://localhost:3000/api/v1/indexer/health"
echo ""
echo "Press Ctrl+C to stop all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Handle cleanup
cleanup() {
  echo ""
  echo "Stopping services..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# Wait for processes
wait
