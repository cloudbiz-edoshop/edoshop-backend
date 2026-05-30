$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$minioExe = Join-Path $projectRoot "tools\\minio\\minio.exe"
$dataDir = Join-Path $projectRoot "tools\\minio\\data"

if (-not (Test-Path $minioExe)) {
  Write-Error "MinIO binary not found at $minioExe. Download it first to tools\\minio\\minio.exe."
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

$env:MINIO_ROOT_USER = "minioadmin"
$env:MINIO_ROOT_PASSWORD = "minioadmin"

& $minioExe server $dataDir --console-address ":9001"
