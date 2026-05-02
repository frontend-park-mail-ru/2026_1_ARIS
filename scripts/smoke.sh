#!/usr/bin/env bash
# Smoke-проверка после деплоя. Код выхода 0 — успех, 1 — ошибка.
# Использование: BASE_URL=https://aris.example.com bash scripts/smoke.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
TIMEOUT="${TIMEOUT:-10}"

GREEN='\033[32m'
RED='\033[31m'
RESET='\033[0m'

FAILED=0

pass() { printf "${GREEN}[PASS]${RESET} %s\n" "$1"; }
fail() { printf "${RED}[FAIL]${RESET} %s\n" "$1"; FAILED=1; }

check_status() {
  local label="$1"
  local url="$2"
  local expected="${3:-200}"
  local actual
  actual="$(curl -o /dev/null -sw '%{http_code}' --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")"
  if [ "$actual" = "$expected" ]; then
    pass "$label → HTTP $actual"
  else
    fail "$label → ожидался HTTP $expected, получен HTTP $actual"
  fi
}

echo "Smoke-проверка: $BASE_URL"
echo "---"

# /health должен вернуть 200 с JSON status:ok
HEALTH_BODY="$(curl -sf --max-time "$TIMEOUT" "$BASE_URL/health" 2>/dev/null || echo "")"
if printf '%s' "$HEALTH_BODY" | grep -q '"status":"ok"'; then
  pass "/health → status ok"
else
  fail "/health → неожиданный ответ: ${HEALTH_BODY:-<нет ответа>}"
fi

# SPA должен загружаться
check_status "/" "$BASE_URL/"

# SPA-фолбэк маршруты должны возвращать 200
check_status "/login" "$BASE_URL/login"
check_status "/feed"  "$BASE_URL/feed"

# Статические файлы не должны отдавать 404 (sw.js всегда есть в public/)
check_status "sw.js"  "$BASE_URL/sw.js"

echo "---"
if [ "$FAILED" -ne 0 ]; then
  echo "Smoke-проверка НЕ ПРОЙДЕНА"
  exit 1
fi
echo "Smoke-проверка ПРОЙДЕНА"
