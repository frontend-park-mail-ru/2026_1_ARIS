# Product Features Backend Handoff

Дата: 2026-05-18.

## Что реализовано на фронтенде

### Комментарии постов

#### UI (реализовано в этой сессии)

Под каждым постом на странице профиля:

- Отображается один комментарий первого уровня (preview) — загружается запросом `GET /api/post/{postId}/comments?limit=1&offset=0` после рендера страницы.
- Число комментариев показано в футере поста рядом с иконкой чата.
- Авторизованному пользователю доступно поле ввода + кнопка «Отправить» для добавления нового комментария.
- После отправки preview обновляется новым комментарием, счётчик в футере инкрементируется без перезагрузки страницы.

Файлы, затронутые реализацией:

- `src/api/posts.ts` — API-клиент, без изменений (уже был готов).
- `src/state/i18n.ts` — добавлены ключи `profile.commentPlaceholder`, `profile.commentSubmit`, `profile.commentSendError` (RU + EN).
- `src/pages/profile/profile.css` — добавлены стили `.profile-post__comments`, `.profile-post__comment`, `.profile-post__comment-author`, `.profile-post__comment-text`, `.profile-post__comment-form`, `.profile-post__comment-input`, `.profile-post__comment-send`, `.profile-post__comment-error` с dark-mode override.
- `src/pages/profile/render.ts` — в `renderProfilePosts` добавлен блок `.profile-post__comments` с preview-слотом и формой ввода.
- `src/pages/profile/events.ts` — добавлены `loadCommentPreviews` (lazy fetch + cache), submit-обработчик для формы комментария, вызов `loadCommentPreviews` при биндинге и после каждого перерендера постов.

#### Используемые API-методы

Фронт использует отдельные API-методы комментариев из `src/api/posts.ts`:

- `GET /api/post/{postId}/comments?limit&offset` — комментарии первого уровня.
- `GET /api/post/{postId}/comments/{commentId}/replies?limit&offset` — ответы конкретного комментария.
- `GET /api/post/{postId}/comments/replies?parentIds=1,2,3&limit&offset` — batch-загрузка ответов для нескольких родителей.
- `POST /api/post/{postId}/comments` — создание комментария или ответа.
- `PATCH /api/post/{postId}/comments/{commentId}` — редактирование текста.
- `DELETE /api/post/{postId}/comments/{commentId}` — удаление.

Текущая схема загрузки рациональна для ленивого раскрытия веток: сначала берём первый уровень, затем подгружаем детей только у раскрытого комментария. Для массового раскрытия фронт теперь может использовать batch endpoint:

`GET /api/post/{postId}/comments/replies?parentIds=1,2,3&limit=50&offset=0`

Фронт ожидает ответ объектом `{ [parentId]: Comment[] }`.

#### Ожидаемый формат ответа комментария

`GET /api/post/{postId}/comments` и `POST /api/post/{postId}/comments`:

```json
[
  {
    "id": 42,
    "uid": "uuid-string",
    "text": "Текст комментария",
    "postId": 7,
    "parentCommentId": null,
    "author": {
      "profileID": 1,
      "firstName": "Иван",
      "lastName": "Иванов",
      "username": "ivan",
      "avatarURL": "https://..."
    },
    "createdAt": "2026-05-18T12:00:00Z",
    "updatedAt": "2026-05-18T12:00:00Z",
    "repliesCount": 0
  }
]
```

Поля `id`, `text`, `author.firstName`, `author.lastName`, `author.username` обязательны для отображения preview.

### Вложения постов

API постов на фронте уже отправляет и принимает разделённые массивы:

- `media` — изображения и видео.
- `files` — остальные файлы.

Поддержанные методы:

- `POST /api/post/upload`
- `PATCH /api/post/{postId}`
- `GET /api/post/{postId}`
- списки постов профиля/сообщества
- feed, где поле медиа называется `medias`, а файлы — `files`

Важно: в UI профиля/сообществ исторически остался image-first composer. API-слой готов к `files`, а feed уже читает `medias/files`.

### Вложения сообщений

В чате добавлена отправка вложений через `POST /api/media/upload?for=message`, после чего сообщение отправляется так:

```json
{
  "text": "Привет",
  "media": [{ "mediaID": 1 }],
  "files": [{ "mediaID": 2 }]
}
```

Фронт делит выбранные файлы по MIME до отправки:

- `image/*`, `video/*` → `media`
- всё остальное → `files`

Ответ сообщения отображается двумя отдельными группами: фото/видео и файлы.

### Стикер-сообщения

Фронт отправляет стикер строго отдельным сообщением:

```json
{
  "stickerId": 10
}
```

При наличии `stickerId` API-клиент фронта намеренно отбрасывает `text`, `media` и `files` из payload, чтобы не нарушить backend-валидацию.

Ответ сообщения должен продолжать содержать:

```json
{
  "sticker": "10",
  "stickerData": {
    "id": "10",
    "packId": "1",
    "mediaId": "77",
    "mimeType": "image/png",
    "url": "https://..."
  },
  "media": [],
  "files": []
}
```

### Стикерпаки и добавление стикеров

Фронт подключил новый API:

- `GET /api/sticker-packs?search=cats&limit=50&offset=0`
- `POST /api/sticker-packs`
- `GET /api/sticker-packs/{packId}/stickers?limit=100&offset=0`
- `POST /api/sticker-packs/{packId}/stickers`
- `POST /api/media/upload?for=sticker`

В интерфейсе чата теперь можно:

- искать стикерпаки по названию;
- создать пользовательский стикерпак;
- выбрать активный стикерпак;
- добавить новый стикер в активный пак;
- отправить стикер отдельным сообщением.

Фронт перед загрузкой стикера проверяет `file.type.startsWith("image/")`. Backend всё равно должен оставаться источником истины и валидировать, что media-файл принадлежит текущему пользователю, пак принадлежит текущему пользователю, MIME начинается с `image/`.

## Что фронту важно от бэкенда

1. Для `GET /api/sticker-packs` поле `authorId` фронт ожидает всегда: строковый/числовой ID автора или `null`.
2. Для `GET /api/sticker-packs?my=true` — фронт использует этот эндпоинт для отображения только своих паков при добавлении стикера; параметр `my` теперь поддерживается в API-клиенте.
3. Для сообщений с файлами в ответе нужны стабильные поля `id`, `uid`, `mimeType`, `url`.
4. Для стикеров в сообщениях нужен заполненный `stickerData.url`; иначе фронт покажет пустое стикер-сообщение.
5. Batch endpoint комментариев подключён на уровне API-клиента фронта как `getPostCommentRepliesBatch`.
6. `POST /api/media/upload?for=message` и `?for=sticker` должны возвращать `media[].mediaID` и `media[].mediaURL`; фронт использует эти ID в последующих запросах.
7. **Количество комментариев в посте** — поле `comments` (или `commentsCount`, `comments_count`) в объекте поста. Фронт читает любое из трёх имён. Без этого поля счётчик всегда показывает 0 и preview-комментарий не грузится.
8. **Лайки комментариев** — фронт поддерживает `POST/DELETE /api/post/{id}/comments/{commentId}/likes`. `CommentResponse` должен содержать `likes: number` и `isLiked: bool`.

## Что реализовано в этой сессии (дополнительно)

### Количество комментариев

- `src/api/posts.ts` — `RawPost` теперь читает поля `comments`, `commentsCount`, `comments_count`; маппит в `PostResponse.comments`.
- `src/pages/profile/profile.ts` и `src/pages/communities/helpers.ts` — используют `post.comments ?? 0` вместо хардкода `0`.

### Ответы на комментарии (reply)

- На preview-комментарии появилась кнопка «Ответить» (скрыта, показывается при hover).
- Клик устанавливает `parentCommentId` на форме и меняет плейсхолдер на «Ответить @имя».
- Submit передаёт `parentCommentId` в `POST /api/post/{id}/comments`.

### Лайки комментариев

- Добавлены `likePostComment` / `unlikePostComment` в `src/api/posts.ts`.
- `PostComment` теперь содержит `likes: number` и `isLiked: boolean` (маппится из ответа).

### Иконки файлов

- Создан `/public/assets/img/icons/file.svg` и `/public/assets/img/icons/send.svg`.
- Все вхождения символа `□` заменены на `<img src="/assets/img/icons/file.svg">` в: `profile/render.ts`, `profile/composer.ts`, `communities/render.ts`, `chats/render.ts`.

## Проверки фронта

Успешно:

- `npm run typecheck`
- `npm run lint`

Не удалось запустить в текущем окружении из-за Node `v18.19.1`:

- `vitest`: зависимость импортирует `node:util.styleText`, доступно в более новом Node.
- `stylelint`: зависимость использует JSON import attributes.
- `webpack build`: `copy-webpack-plugin` использует `Array.prototype.toSorted`, доступно в Node 20+.

Для полного CI нужен Node 20+.
