#!/usr/bin/env bash

set -euo pipefail

INSTALL_STATIC="${INSTALL_STATIC:-false}"

echo "[deploy] installing dependencies"
npm ci

echo "[deploy] building frontend"
npm run build

if [ "$INSTALL_STATIC" = "true" ]; then
  APP_ROOT="${APP_ROOT:-/var/www/aris}"
  TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/arisfront-deploy.XXXXXX")"

  cleanup() {
    rm -rf "$TMP_DIR"
  }

  trap cleanup EXIT

  echo "[deploy] staging files in $TMP_DIR"
  cp -R dist/. "$TMP_DIR/"

  echo "[deploy] syncing build to $APP_ROOT"
  sudo mkdir -p "$APP_ROOT"
  sudo find "$APP_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  sudo cp -R "$TMP_DIR"/. "$APP_ROOT"/

  echo "[deploy] static files installed"
  ls -la "$APP_ROOT/sw.js"
else
  echo "[deploy] build is ready in ./dist"
  echo "[deploy] start frontend with: HOST=127.0.0.1 PORT=3001 npm start"
fi
