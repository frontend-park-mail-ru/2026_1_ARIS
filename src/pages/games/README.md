# `/games`

## Слои

- `games.ts` — orchestration страницы: маршруты, связывание событий, runtime sync и сборка зависимостей.
- `actions/` — async actions страницы: API-запросы, app-state зависимости и пользовательские side effects; `page-action-handlers.ts` собирает фасады действий для composition root.
- `state/` — состояние страницы и `StateManager`.
- `room/` — общая логика комнаты: доступ, селекторы, socket-state, lobby/action helpers.
- `room/profile/` — профильный слой комнаты: имена игроков, аватары, гендер и системные сообщения.
- `room/state/` — чистые room-state трансформации: optimistic actions, lobby updates, answer progress, socket-state.
- `chat/` — модель и render чата комнаты.
- `round/` — расчёт результата и таймлайн раскрытия раунда.
- `events/` — DOM-event binding helpers, которые подключаются из orchestration-слоя; крупные доменные сценарии можно держать во вложенных папках.
- `runtime/` — lifecycle, polling/socket/chat runtime, DOM refresh adapters, DOM-root и pending-состояния, которые не входят в `StateManager`.
- `render/` — чистые render-модули без API-запросов.
- `render/room/` — чистый render комнаты: панель комнаты, игроки, статусы и профильные ссылки.
- `shared/` — общие formatter/error/form/timer/popover helpers и каталог игр.
- `styles/` — смысловые CSS-слои, подключённые через `games.css`.

## Правила развития

- Общий flow комнаты: создание, вход, список комнат, пароль, готовность, чат и админские действия должны оставаться game-agnostic.
- Специфика конкретной игры должна жить в registry/config и в отдельных моделях/render-модулях игры, а не в общем room-flow.
- Новые пользовательские строки нужно заводить через i18n-слой, учитывая RU/EN. Старые строки ещё не полностью мигрированы.
- Стили должны опираться на существующие CSS tokens и корректно работать в light/dark theme без жёсткой привязки к одной теме.
- Render-модули не делают API-запросы и не меняют DOM напрямую; side effects остаются в runtime/actions слоях.
- Временные runtime-флаги страницы (`pending toast`, `voluntary leave`, ключи жалоб, DOM-root) держим в `runtime/*`, а не глобальными переменными в `games.ts`.
- Новые группы пользовательских действий подключаем через action composition, а не длинным списком фабрик внутри `games.ts`.
