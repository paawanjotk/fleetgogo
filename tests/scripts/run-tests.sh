#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TESTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT"

bash "$SCRIPT_DIR/docker-up.sh"

cd "$TESTS_DIR"

if [[ ! -d node_modules ]]; then
  echo "Installing test dependencies..."
  npm install
fi

echo ""
echo "Running integration tests..."
echo ""

npm test
TEST_EXIT=$?

if [[ "${KEEP_RUNNING:-false}" != "true" ]]; then
  echo ""
  bash "$SCRIPT_DIR/docker-down.sh"
else
  echo ""
  echo "KEEP_RUNNING=true — Docker stack left running."
  echo "Stop with: npm run docker:down (from tests/)"
fi

exit $TEST_EXIT
