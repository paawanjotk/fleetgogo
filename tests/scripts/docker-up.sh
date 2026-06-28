#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

ensure_env_files() {
  for service in driver vehicle trips gatewaygraphql; do
    if [[ ! -f "$service/.env" ]]; then
      echo "Creating $service/.env from .env.example"
      cp "$service/.env.example" "$service/.env"
    fi
  done
}

wait_for_health() {
  local url="$1"
  local name="$2"
  local max_attempts="${3:-60}"
  local attempt=1

  echo "Waiting for $name at $url ..."
  while [[ $attempt -le $max_attempts ]]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "$name is ready"
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done

  echo "ERROR: $name did not become healthy in time"
  compose ps
  return 1
}

ensure_env_files

echo "Starting Docker stack..."
if compose up --help 2>&1 | grep -q '\-\-wait'; then
  compose up --build -d --wait
else
  compose up --build -d
  wait_for_health "http://localhost:3001/health" "driver"
  wait_for_health "http://localhost:3002/health" "vehicle"
  wait_for_health "http://localhost:3003/health" "trips"
  wait_for_health "http://localhost:4000/health" "gateway"
fi

echo "All services are up."
