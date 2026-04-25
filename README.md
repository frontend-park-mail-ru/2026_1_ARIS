# 2026_1_ARIS

Проект "ВК" команды АРИС — социальная сеть, разработанная на TypeScript без фреймворков.

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

### Стек технологий

- **TypeScript** — без React/Vue; каждая страница — отдельный модуль
- **Webpack 5 + Babel** — сборка и транспиляция
- **Custom `@aris/router`** — клиентский SPA-роутер (пакет в `packages/router`)
- **CSS Custom Properties** — дизайн-токены в `src/styles/tokens.css`
- **Service Worker** — офлайн-поддержка через `packages/offline`

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
└── styles/        # Глобальные стили и токены
```

`StateManager<T>` — реактивное хранилище с методами `patch()` / `subscribe()`, используется в `sessionStore` и `friendsStore`.

### Разработка

```bash
# Установка зависимостей
npm install

# Режим разработки с hot-reload
npm run dev

# Production-сборка в dist/
npm run build

# Линтинг
npm run lint
```

### Деплой

Сборка публикуется на self-hosted nginx-сервер скриптом:

```bash
npm run deploy          # запускает scripts/deploy.sh
# или напрямую:
APP_ROOT=/var/www/aris bash scripts/deploy.sh
```
