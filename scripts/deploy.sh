#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/aris}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/arisfront-deploy.XXXXXX")"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

echo "[deploy] installing dependencies"
npm ci

echo "[deploy] building frontend"
npm run build

echo "[deploy] staging files in $TMP_DIR"
cp -R dist/. "$TMP_DIR/"

echo "[deploy] syncing build to $APP_ROOT"
sudo mkdir -p "$APP_ROOT"
sudo find "$APP_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
sudo cp -R "$TMP_DIR"/. "$APP_ROOT"/

echo "[deploy] done"
ls -la "$APP_ROOT/sw.js"
