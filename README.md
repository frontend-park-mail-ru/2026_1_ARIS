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
- Swagger: https://arisnet.ru/swagger/index.html


### How-to-run

Для локальной разработки сначала поднимите backend из соседнего репозитория:

```bash
cd ../arisback
cp .env.example .env
make local-up
```

Затем запустите frontend:

```bash
cd ../arisfront
npm install
BACKEND_URL=http://localhost:8080 npm run dev
```

Frontend будет доступен на `http://localhost:3001`, backend API - на `http://localhost:8080`.

Для локального запуска production-сборки:

```bash
npm run build
PORT=3001 NODE_ENV=production npm start
```
