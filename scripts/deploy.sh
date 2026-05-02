#!/usr/bin/env bash
# Скрипт деплоя ARIS frontend.
#
# Режимы:
#   INSTALL_STATIC=true  — сборка + копирование в $APP_ROOT, перезапуск, smoke-проверка
#   по умолчанию         — только сборка (результат в ./dist)
#   --rollback           — восстановить $APP_ROOT из резервной копии
#
# Переменные окружения:
#   APP_ROOT        целевая директория (по умолчанию: /var/www/aris)
#   INSTALL_STATIC  установить в "true" для деплоя после сборки
#   PM2_NAME        имя PM2-процесса для перезапуска после деплоя
#   SYSTEMD_SERVICE systemd-юнит для перезапуска после деплоя (через sudo)
#   RESTART_CMD     произвольная команда перезапуска сервера
#   BASE_URL        если задан, запускает smoke-проверку после перезапуска
#   BUILD_COMMIT    SHA коммита, встраивается в ответ /health
#   BUILD_VERSION   версия релиза, встраивается в ответ /health

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/aris}"
INSTALL_STATIC="${INSTALL_STATIC:-false}"

ts() { date '+%H:%M:%S'; }
log() { echo "[deploy $(ts)] $*"; }

restart_server() {
  if [ -n "${PM2_NAME:-}" ]; then
    log "перезапуск PM2-процесса: $PM2_NAME"
    pm2 restart "$PM2_NAME"
  elif [ -n "${SYSTEMD_SERVICE:-}" ]; then
    log "перезапуск systemd-сервиса: $SYSTEMD_SERVICE"
    sudo systemctl restart "$SYSTEMD_SERVICE"
  elif [ -n "${RESTART_CMD:-}" ]; then
    log "выполнение команды перезапуска: $RESTART_CMD"
    eval "$RESTART_CMD"
  else
    log "цель перезапуска не задана (укажите PM2_NAME, SYSTEMD_SERVICE или RESTART_CMD)"
  fi
}

wait_for_health() {
  local url="${1}/health"
  local max=15 attempt=0
  log "ожидание health check на $url (до 30 сек)"
  while [ $attempt -lt $max ]; do
    if curl -sf --max-time 2 "$url" 2>/dev/null | grep -q '"status":"ok"'; then
      log "health check пройден"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  log "health check не ответил за 30 сек"
  return 1
}

# ── откат ────────────────────────────────────────────────────────────────────
if [ "${1:-}" = "--rollback" ]; then
  PREV="${APP_ROOT}.prev"
  if [ ! -d "$PREV" ]; then
    echo "[deploy] резервная копия не найдена: $PREV — откат невозможен"
    exit 1
  fi
  log "откат $APP_ROOT из $PREV"
  sudo find "$APP_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  sudo cp -R "$PREV"/. "$APP_ROOT"/
  restart_server
  if [ -n "${BASE_URL:-}" ]; then
    wait_for_health "$BASE_URL"
    BASE_URL="$BASE_URL" bash "$(dirname "$0")/smoke.sh"
  fi
  log "откат завершён"
  exit 0
fi

# ── сборка ───────────────────────────────────────────────────────────────────
log "установка зависимостей"
npm ci

log "сборка фронтенда"
BUILD_COMMIT="${BUILD_COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")}"
BUILD_VERSION="${BUILD_VERSION:-$(node -p "require('./package.json').version")}"
BUILD_COMMIT="$BUILD_COMMIT" BUILD_VERSION="$BUILD_VERSION" npm run build

# ── установка ────────────────────────────────────────────────────────────────
if [ "$INSTALL_STATIC" = "true" ]; then
  PREV="${APP_ROOT}.prev"
  TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/arisfront-deploy.XXXXXX")"

  cleanup() { rm -rf "$TMP_DIR"; }
  trap cleanup EXIT

  log "подготовка сборки в $TMP_DIR"
  cp -R dist/. "$TMP_DIR/"

  # Резервная копия текущего релиза перед заменой
  if [ -d "$APP_ROOT" ] && [ -n "$(ls -A "$APP_ROOT" 2>/dev/null)" ]; then
    log "резервная копия текущего релиза → $PREV"
    sudo rm -rf "$PREV"
    sudo cp -R "$APP_ROOT" "$PREV"
  fi

  log "обновление $APP_ROOT"
  sudo mkdir -p "$APP_ROOT"
  sudo find "$APP_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  sudo cp -R "$TMP_DIR"/. "$APP_ROOT"/
  log "файлы установлены (sw.js: $(ls -lh "$APP_ROOT/sw.js" | awk '{print $5}'))"

  restart_server

  if [ -n "${BASE_URL:-}" ]; then
    if wait_for_health "$BASE_URL"; then
      BASE_URL="$BASE_URL" bash "$(dirname "$0")/smoke.sh"
    else
      log "сервер не поднялся — выполняется откат"
      sudo find "$APP_ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
      sudo cp -R "$PREV"/. "$APP_ROOT"/
      restart_server
      log "откат завершён — разберитесь в причине и повторите деплой"
      exit 1
    fi
  fi
else
  log "сборка готова в ./dist"
  log "для установки: INSTALL_STATIC=true bash scripts/deploy.sh"
  log "для запуска:   HOST=127.0.0.1 PORT=3001 NODE_ENV=production npm start"
fi
