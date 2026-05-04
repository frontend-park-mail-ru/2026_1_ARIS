# ARIS Frontend — Runbook

## Архитектура

```
Интернет → nginx (443 HTTPS) → Node.js сервер (127.0.0.1:3001)
```

Фронтенд-сервер раздаёт статические файлы SPA и проксирует изображения.
TLS терминируется nginx (из репозитория бэкенда). Node.js процесс
должен быть доступен на `127.0.0.1:3001`, чтобы nginx мог проксировать запросы.

---

## Требования

| Инструмент | Версия |
| ---------- | ------ |
| Node.js    | 20+    |
| npm        | 10+    |
| curl       | любая  |

Переменные окружения на сервере:

| Переменная           | Описание                             | Пример                             |
| -------------------- | ------------------------------------ | ---------------------------------- |
| `HOST`               | Адрес для привязки                   | `127.0.0.1`                        |
| `PORT`               | Порт                                 | `3001`                             |
| `BACKEND_URL`        | URL бэкенд API                       | `http://localhost:8080`            |
| `NODE_ENV`           | Режим запуска                        | `production`                       |
| `APP_ROOT`           | Директория установки статики         | `/var/www/aris`                    |
| `PM2_NAME`           | Имя процесса PM2 (если используется) | `arisfront`                        |
| `SYSTEMD_SERVICE`    | systemd-юнит для перезапуска         | `arisfront`                        |
| `RESTART_CMD`        | Произвольная команда перезапуска     | `sudo systemctl restart arisfront` |
| `BASE_URL`           | Публичный URL для smoke-проверок     | `https://aris.example.com`         |
| `BUILD_COMMIT`       | SHA релиза для `/health`             | `a1b2c3d`                          |
| `BUILD_VERSION`      | Версия релиза для `/health`          | `1.0.0`                            |
| `SENTRY_DSN`         | (опционально) Sentry DSN             |                                    |
| `SENTRY_ENVIRONMENT` | (опционально) окружение Sentry       | `production`                       |
| `SENTRY_RELEASE`     | (опционально) релиз Sentry           | `arisfront@1.0.0`                  |

---

## Локальная проверка перед PR

Быстрый обязательный набор:

```bash
npm run format:check
npm run lint
npm run lint:css
npm run typecheck
npm run test
npm run build
```

То же самое одной командой:

```bash
npm run check
```

Unit-тесты используют Vitest. Для HTML-отчёта Allure:

```bash
npm run test:allure
npm run allure:open
```

Полезные команды Allure:

| Команда                   | Что делает                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run test:allure`     | очищает старые `allure-results` / `allure-report`, запускает Vitest и собирает свежий HTML-отчёт |
| `npm run allure:open`     | открывает уже собранный `allure-report`                                                          |
| `npm run allure:serve`    | поднимает временный Allure-сервер из `allure-results`                                            |
| `npm run allure:generate` | собирает `allure-report` из текущих `allure-results`                                             |
| `npm run allure:clean`    | удаляет `allure-results` и `allure-report`                                                       |

Покрытие кода:

```bash
npm run test:coverage
```

HTML-отчёт покрытия пишется в `coverage/`.

---

## Стандартный деплой

```bash
# На сервере, из корня репозитория:
git pull origin main

INSTALL_STATIC=true \
  BASE_URL=https://aris.example.com \
  BUILD_COMMIT=$(git rev-parse --short HEAD) \
  NODE_ENV=production \
  bash scripts/deploy.sh
```

Скрипт выполняет:

1. `NODE_ENV=development npm ci` — установка зависимостей, включая dev-зависимости для сборки
2. `npm run build` — продакшен-сборка с SHA коммита
3. Резервная копия текущего `$APP_ROOT` → `$APP_ROOT.prev`
4. Замена содержимого `$APP_ROOT` на новую сборку
5. Перезапуск сервера (через `PM2_NAME`, `SYSTEMD_SERVICE` или `RESTART_CMD`)
6. Опрос `/health` до получения `status: ok` (до 30 сек)
7. Smoke-проверка — автоматический откат при падении

### С Sentry

```bash
INSTALL_STATIC=true \
  BASE_URL=https://aris.example.com \
  SENTRY_DSN=https://... \
  SENTRY_ENVIRONMENT=production \
  SENTRY_RELEASE=arisfront@$(node -p "require('./package.json').version") \
  NODE_ENV=production \
  bash scripts/deploy.sh
```

---

## Откат

Откат к предыдущему релизу (резервная копия создаётся при каждом деплое):

```bash
BASE_URL=https://aris.example.com bash scripts/deploy.sh --rollback
```

Скрипт восстанавливает `$APP_ROOT.prev` → `$APP_ROOT`, перезапускает сервер
и прогоняет smoke-проверку.

> **Доступен только один уровень отката.** Для возврата к более ранней версии
> нужно выбрать нужный коммит через `git` и повторить деплой.

---

## Проверка здоровья

```bash
curl -s https://aris.example.com/health | python3 -m json.tool
```

Ожидаемый ответ:

```json
{
  "status": "ok",
  "uptime": 142,
  "commit": "a1b2c3d",
  "version": "1.0.0",
  "timestamp": "2026-05-02T10:00:00.000Z"
}
```

После деплоя убедиться, что `commit` соответствует ожидаемому SHA.

---

## Smoke-проверка

Запустить вручную после любого деплоя или изменения конфигурации:

```bash
BASE_URL=https://aris.example.com bash scripts/smoke.sh
```

Выполняемые проверки:

- `GET /health` → `status: ok`
- `GET /` → HTTP 200
- `GET /login` → HTTP 200
- `GET /feed` → HTTP 200
- `GET /sw.js` → HTTP 200

Код выхода `0` — все проверки прошли. Код `1` — одна или более упали.

---

## Управление процессом (PM2)

Запуск:

```bash
HOST=127.0.0.1 PORT=3001 NODE_ENV=production \
  pm2 start "npm start" --name arisfront
pm2 save
```

Перезапуск:

```bash
pm2 restart arisfront
```

Логи:

```bash
pm2 logs arisfront --lines 100
```

Статус:

```bash
pm2 status
```

---

## Типичные проблемы

### Сервер не стартует — `EADDRINUSE`

Порт 3001 занят другим процессом.

```bash
lsof -i :3001
# завершить или перезапустить конфликтующий процесс
```

### `/health` возвращает 502 или таймаут после деплоя

Node.js процесс не успел запуститься. Смотреть логи:

```bash
pm2 logs arisfront --lines 50
# или
journalctl -u arisfront -n 50
```

Частые причины: не выполнен `npm ci` перед запуском, в `dist/` отсутствует `index.html`.

### Smoke-проверка `/login` или `/feed` → 404

SPA-фолбэк не возвращает `index.html` для неизвестных маршрутов. Проверить наличие
`dist/index.html`. Монтирование статики должно идти раньше catch-all роута
в `server/index.ts` — пересобрать и повторить деплой.

### После деплоя `/health` отдаёт старый SHA коммита

Сервер не был перезапущен после установки новой сборки. Задать `PM2_NAME`
(или `SYSTEMD_SERVICE` / `RESTART_CMD`), чтобы `deploy.sh` перезапускал его автоматически.

### nginx возвращает 502, но Node работает

nginx не проксирует на `127.0.0.1:3001`. Проверить upstream-блок nginx
в конфиге репозитория бэкенда. Убедиться, что `HOST=127.0.0.1` (не `0.0.0.0`) —
сервер должен слушать на loopback-интерфейсе, на который указывает nginx.

---

## CI / CD

| Воркфлоу                        | Триггер                                                                           | Что делает                                                            |
| ------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | push в `dev`, `main`, `master`, `staging`, `ARIS-*`; PR в `dev`, `main`, `master` | `npm run ci` (`format:check`, lint, css lint, typecheck, test, build) |
| `.github/workflows/deploy.yml`  | push в `main`                                                                     | деплой по SSH + smoke-проверка + уведомление в Telegram               |
| `.github/workflows/staging.yml` | push в `dev`                                                                      | деплой на staging + smoke-проверка + уведомление                      |

Секреты задаются в GitHub → Settings → Secrets and variables → Actions.

Production-секреты:

| Секрет               | Описание                                   |
| -------------------- | ------------------------------------------ |
| `DEPLOY_HOST`        | IP или домен сервера                       |
| `DEPLOY_USER`        | SSH-пользователь                           |
| `DEPLOY_SSH_KEY`     | SSH приватный ключ (рекомендуется ed25519) |
| `DEPLOY_PATH`        | Абсолютный путь к репозиторию на сервере   |
| `DEPLOY_BASE_URL`    | Публичный URL для smoke-проверок           |
| `TELEGRAM_BOT_TOKEN` | (опционально) токен Telegram-бота          |
| `TELEGRAM_CHAT_ID`   | (опционально) ID чата Telegram             |

Staging-секреты (те же данные, другой сервер):

| Секрет                    | Описание                                   |
| ------------------------- | ------------------------------------------ |
| `STAGING_DEPLOY_HOST`     | IP или домен staging-сервера               |
| `STAGING_DEPLOY_USER`     | SSH-пользователь                           |
| `STAGING_DEPLOY_SSH_KEY`  | SSH приватный ключ (рекомендуется ed25519) |
| `STAGING_DEPLOY_PATH`     | Абсолютный путь к репозиторию на сервере   |
| `STAGING_DEPLOY_BASE_URL` | Публичный URL staging для smoke-проверок   |

---

## Staging-контур

Staging — отдельный сервер (или путь) для проверки фич до попадания в `main`.
Актуальный GitHub Actions staging-деплой запускается при push в `dev`.

### Деплой на staging вручную

Вариант, совпадающий с `.github/workflows/staging.yml`:

```bash
# На staging-сервере, из корня репозитория:
git fetch --all
git reset --hard origin/dev

NODE_ENV=development npm ci

BUILD_COMMIT=$(git rev-parse HEAD)
BUILD_VERSION=$(node -p "require('./package.json').version")

BUILD_COMMIT="$BUILD_COMMIT" \
  BUILD_VERSION="$BUILD_VERSION" \
  SENTRY_ENVIRONMENT=staging \
  NODE_ENV=production \
  npm run build

printf 'BUILD_COMMIT=%s\nBUILD_VERSION=%s\n' "$BUILD_COMMIT" "$BUILD_VERSION" > .env.build
sudo systemctl set-environment BUILD_COMMIT="$BUILD_COMMIT" BUILD_VERSION="$BUILD_VERSION"
sudo systemctl restart arisfront

BASE_URL=https://staging.aris.example.com bash scripts/smoke.sh
```

### Процесс работы

```
feature-branch → PR → dev → staging-проверка → PR → main → production
```

1. Смержить фичу в `dev` (или запушить напрямую, если это принято в процессе)
2. GitHub Actions автоматически задеплоит на staging-сервер
3. Проверить фичу на `https://staging.aris.example.com`
4. При подтверждении — PR в `main`

### Откат на staging

Текущий staging workflow не делает резервную копию через `scripts/deploy.sh`, поэтому
откат выполняется возвратом `dev` к нужному коммиту и повторной сборкой:

```bash
# На staging-сервере:
git fetch --all
git reset --hard <good-commit-sha>
NODE_ENV=development npm ci

BUILD_COMMIT=$(git rev-parse HEAD)
BUILD_VERSION=$(node -p "require('./package.json').version")
BUILD_COMMIT="$BUILD_COMMIT" BUILD_VERSION="$BUILD_VERSION" \
  SENTRY_ENVIRONMENT=staging \
  NODE_ENV=production \
  npm run build

sudo systemctl set-environment BUILD_COMMIT="$BUILD_COMMIT" BUILD_VERSION="$BUILD_VERSION"
sudo systemctl restart arisfront
BASE_URL=https://staging.aris.example.com bash scripts/smoke.sh
```

Если staging переведён на `INSTALL_STATIC=true bash scripts/deploy.sh`, тогда можно
использовать стандартный `scripts/deploy.sh --rollback`, потому что в этом режиме
создаётся `$APP_ROOT.prev`.
