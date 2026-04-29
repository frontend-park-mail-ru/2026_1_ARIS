# ARIS Frontend

Frontend социальной сети ARIS.

### Команда

- [Сергей Шульгиненко](https://github.com/londonwaterloo) - Frontend
- [Иван Хвостов](https://github.com/KokInside) - Backend

### Менторы

- [Софья Ситниченко](https://github.com/sonichka-s) — Frontend
- [Константин Галанин](https://github.com/KonstantinGalanin) — Backend
- [Владислав Алехин](https://github.com/3kybika) — Database
- Даниил Хасьянов — UX

### Ссылки

- [Деплой](https://arisnet.ru)
- [Backend repository](https://github.com/go-park-mail-ru/2026_1_ARIS/)
- [Figma](https://figma.com/design/fhzdyBQ8qjNFRCRVriSrK9/VK.com?node-id=8-16&p=f&t=u2EXBO6Pxh6QqWVC-0)

### Описание

Проект написан на TypeScript без UI-фреймворков и построен как SPA с собственным роутером, набором переиспользуемых компонентов и явным разделением между страницами, API-слоем и состоянием приложения.

### Стек технологий

- **TypeScript** — без React/Vue; каждая страница — отдельный модуль
- **Webpack 5 + Babel** — сборка и транспиляция
- **Custom `@aris/router`** — клиентский SPA-роутер (пакет в `packages/router`)
- **CSS Custom Properties** — дизайн-токены в `src/styles/tokens.css`
- **Service Worker** — офлайн-поддержка через `packages/offline`

### Быстрый старт

Требования:

- `Node.js 20+`
- `npm 10+`

Установка и запуск:

```bash
npm install
npm run dev
```

По умолчанию frontend поднимается локально, а сетевые запросы идут в backend, настроенный в проекте и dev-конфиге.

Production-сборка:

```bash
npm run build
```

### Архитектура

Приложение построено по слоистой схеме:

```
src/
├── api/           # HTTP-клиент и все запросы к backend
│   └── core/      # apiRequest(), ApiError, trackedFetch
├── components/    # Переиспользуемые UI-компоненты (header, sidebar, …)
├── pages/         # Страницы (feed, profile, friends, chats)
│   └── <page>/
│       ├── types.ts   # Типы данных страницы
│       ├── state.ts   # Состояние и бизнес-логика
│       ├── render.ts  # HTML-генераторы
│       └── <page>.ts  # Точка входа: renderPage() + initPage()
├── state/         # Глобальное состояние (session, StateManager)
├── utils/         # Кэширование, offline-инструменты и общие helper-функции
├── router/        # Сборка и настройка клиентского роутера
└── styles/        # Глобальные стили и токены
```

`StateManager<T>` — реактивное хранилище с методами `patch()` / `subscribe()`, используется в `sessionStore` и `friendsStore`.

Дополнительные пакеты:

- `packages/router` — внутренний пакет клиентского роутера;
- `packages/offline` — инфраструктура offline-режима, сетевого статуса и service worker-механик.

### Структура каталогов

- `pages/` — страницы приложения (`feed`, `profile`, `friends`, `chats`)
- `components/` — переиспользуемые UI-компоненты
- `api/` — работа с backend и нормализация ответов
- `state/` — глобальное состояние и инфраструктурные store
- `utils/` — утилиты, кэширование, service worker, offline-механики
- `router/` — конфигурация маршрутизации и post-render инициализация
- `public/` — статические файлы, иконки и service worker

### Принципы

- Разделение ответственности:
  страницы отвечают за сценарий целиком, компоненты — за локальный UI, `api/` — за сетевое взаимодействие.
- Offline-first:
  используются `service worker`, outbox и локальное сохранение данных, чтобы интерфейс оставался полезным при нестабильной сети.
- Кэширование:
  лента и часть пользовательских данных кэшируются в памяти и в браузерном хранилище для ускорения повторных открытий.

### Разработка

```bash
npm install
npm run dev
npm run build
npm run lint
```

Основные скрипты:

- `npm run dev` — локальный dev-сервер;
- `npm run build` — production-сборка в `dist/`;
- `npm run lint` — проверка качества кода;
- `npm run deploy` — публикация сборки через локальный deploy-скрипт команды.

### Деплой

Сборка публикуется на self-hosted nginx-сервер командным скриптом:

```bash
npm run deploy          # запускает scripts/deploy.sh
# или напрямую:
APP_ROOT=/var/www/aris bash scripts/deploy.sh
```

Этот сценарий рассчитан на инфраструктуру команды и локальное окружение деплоя. Для стороннего развёртывания обычно достаточно production-сборки из `dist/`.
