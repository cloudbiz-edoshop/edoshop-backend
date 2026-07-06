#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${ROOT_DIR}/.minio-data"

mkdir -p "$DATA_DIR"

export MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
export MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"

echo "Starting MinIO on http://127.0.0.1:9000 (console :9001)"
echo "Data directory: ${DATA_DIR}"

exec minio server "$DATA_DIR" --address ":9000" --console-address ":9001"
