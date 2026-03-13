# Документация API ARIS

## Общая информация

API приложения ARIS реализовано по принципам REST.  
Все взаимодействие между frontend и backend происходит через HTTP-запросы к endpoint'ам `/api/...`.

Основные принципы:

- все запросы и ответы используют формат JSON
- авторизация реализована через cookie-сессию
- frontend отправляет запросы с `credentials: "include"`
- публичные и приватные endpoint'ы разделены
- приложение использует архитектуру SPA (Single Page Application)

Пример запроса с фронтенда:

```javascript
fetch("/api/auth/me", {
  method: "GET",
  credentials: "include",
});
```

---

# AUTH API

## POST /api/auth/register

Регистрация нового пользователя.

### Тело запроса

```json
{
  "firstName": "Иван",
  "lastName": "Иванов",
  "birthday": "24/02/2005",
  "gender": 1,
  "login": "ivan123",
  "password1": "qwerty123",
  "password2": "qwerty123"
}
```

### Параметры

firstName | имя пользователя
lastName | фамилия пользователя
birthday | дата рождения (дд/мм/гггг)
gender | пол пользователя
login | уникальный логин
password1 | пароль
password2 | повтор пароля

### Значения gender

1 | мужской
2 | женский

### Успешный ответ

**201 Created**

```json
{
  "id": "uuid",
  "avatar": null,
  "username": "ivan123",
  "createdAt": "2026-03-13T11:00:00Z",
  "updatedAt": "2026-03-13T11:00:00Z",
  "isActive": true
}
```

### Возможные ошибки

**400 Bad Request**

```json
{
  "error": "validation failed"
}
```

**409 Conflict**

```json
{
  "error": "login already registered"
}
```

## POST /api/auth/login

Авторизация пользователя.

### Тело запроса

```json
{
  "login": "ivan123",
  "password": "qwerty123"
}
```

### Успешный ответ

**200 OK**

```json
{
  "id": "uuid",
  "createdAt": "2026-03-13T11:00:00Z",
  "firstName": "Иван",
  "lastName": "Иванов"
}
```

### Ошибка

**401 Unauthorized**

```json
{
  "error": "неверные учетные данные"
}
```

## POST /api/auth/logout

Выход пользователя из системы.

### Успешный ответ

```json
{
  "message": "successfully logged out"
}
```

Если пользователь уже вышел:

```json
{
  "message": "already logged out"
}
```

## GET /api/auth/me

Получение данных текущего авторизованного пользователя.

### Успешный ответ

```json
{
  "id": "uuid",
  "firstName": "Иван",
  "lastName": "Иванов"
}
```

### Ошибки

**401 Unauthorized**

```json
{
  "error": "не авторизован"
}
```

# FEED API

## GET /api/public/feed

Публичная лента для неавторизованных пользователей.

### Query параметры

cursor | курсор пагинации
limit | количество постов

### Пример запроса

```
GET /api/public/feed?limit=8
```

### Ответ

```json
{
  "posts": [
    {
      "id": "uuid",
      "text": "Привет! Добро пожаловать в ARIS",
      "author": {
        "id": "uuid",
        "firstName": "Команда",
        "lastName": "АРИС",
        "username": "KomandaARIS",
        "avatarLink": "https://example.com/avatar.png"
      },
      "createdAt": "2026-03-13T11:00:00Z",
      "likes": 10,
      "comments": 2,
      "reposts": 1,
      "medias": [
        {
          "id": "uuid",
          "mimeType": "image",
          "mediaLink": "https://example.com/image.jpg"
        }
      ]
    }
  ],
  "nextCursor": "",
  "hasMore": false
}
```

## GET /api/feed

Лента авторизованных пользователей.

### Query параметры

cursor | курсор
limit |количество постов

Формат ответа аналогичен `/api/public/feed`.

### Ошибка

**401 Unauthorized**

```json
{
  "error": "unauthorized"
}
```

# USERS API

## GET /api/users/suggested

Список пользователей для виджета **«Возможно, вы знакомы»**.

Требует авторизации.

### Ответ

```json
{
  "items": [
    {
      "id": "uuid",
      "firstName": "Анна",
      "lastName": "Опарина",
      "username": "AnnaOparina",
      "avatarLink": "https://example.com/avatar.png"
    }
  ]
}
```

## GET /api/public/popular-users

Популярные пользователи для гостевого режима.

### Ответ

```json
{
  "items": [
    {
      "id": "uuid",
      "firstName": "Анна",
      "lastName": "Опарина",
      "username": "AnnaOparina",
      "avatarLink": "https://example.com/avatar.png"
    }
  ]
}
```

## GET /api/users/latest-events

Последние события пользователя.

### Типы событий

1 | пользователь поставил лайк
2 | пользователь добавил фото
3 | пользователь подписался

### Ответ

```json
{
  "items": [
    {
      "id": "uuid",
      "firstName": "Софья",
      "lastName": "Ситниченко",
      "username": "SofiaSitnichenko",
      "avatarLink": "https://example.com/avatar.png",
      "type": 1
    }
  ]
}
```

---

# POSTS API

## GET /api/posts/popular

Популярные посты для авторизованных пользователей.

### Ответ

```json
{
  "items": [
    { "title": "Почему Rust заменяет C++" },
    { "title": "Лучшие книги по ML" },
    { "title": "Как научиться подтягиваться 20 раз" }
  ]
}
```

## GET /api/public/popular-posts

Популярные посты для гостей.

### Ответ

```json
{
  "items": [{ "title": "Веб разработка для начинающих" }, { "title": "JavaScript в 2026 году" }]
}
```

# IMAGE API

## GET /image-proxy

Проксирование изображений из внешних источников.

### Query параметры

url | ссылка на изображение

### Пример запроса

```
GET /image-proxy?url=https%3A%2F%2Fexample.com%2Fimage.jpg
```

# Архитектура API

API разделено на логические домены:

Авторизация | `/api/auth/*`
Лента | `/api/feed`
Публичная лента | `/api/public/feed`
Пользователи | `/api/users/*`
Публичные пользователи | `/api/public/popular-users`
Популярные посты | `/api/posts/*`
Публичные посты | `/api/public/*`

# Архитектурные решения

При проектировании API были приняты следующие решения:

- публичные и приватные endpoint'ы разделены
- используются корректные HTTP методы (`GET`, `POST`)
- ответы имеют единый JSON формат
- авторизация реализована через cookie-сессии
- структура URL отражает сущности системы
- frontend реализован как SPA и взаимодействует с API асин
