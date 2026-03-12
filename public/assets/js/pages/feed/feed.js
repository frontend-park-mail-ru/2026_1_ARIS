import { renderHeader } from "../../components/header/header.js";
import { renderSidebar } from "../../components/sidebar/sidebar.js";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar.js";
import { mockSession } from "../../mock/session.js";
import { renderPostcard } from "../../components/postcard/postcard.js";
import { getFeed } from "../../api/feed.js";

const mockFeedPosts = [
  {
    author: "Команда ARIS",
    time: "1 ч назад",
    text: "Пост без фотографий. Проверяем, как карточка выглядит, когда медиаблок полностью отсутствует.",
    likes: 324,
    comments: 167,
    reposts: 88,
    images: [],
  },
  {
    author: "Анна Смирнова",
    time: "2 ч назад",
    text: "Пост с одной фотографией. Картинка должна занимать весь медиаблок. Также можно здесь написать побольше текста, чтобы проверить как у нас происходит расширение блока с текстом. В идеале - должны остаться 2 строчки, а остальные скрыться. Посмотрим, как будет в реальности",
    likes: 128,
    comments: 14,
    reposts: 6,
    images: ["/assets/img/mock/1.jpg"],
  },
  {
    author: "Иван Хвостов",
    time: "3 ч назад",
    text: "Пост с двумя фотографиями. Они должны делить блок пополам.",
    likes: 245,
    comments: 31,
    reposts: 12,
    images: ["/assets/img/mock/2.jpg", "/assets/img/mock/3.jpg"],
  },
  {
    author: "Ринат Байков",
    time: "4 ч назад",
    text: "Пост с тремя фотографиями. Одна большая слева и две маленькие справа.",
    likes: 512,
    comments: 42,
    reposts: 19,
    images: ["/assets/img/mock/4.jpg", "/assets/img/mock/5.jpg", "/assets/img/mock/6.jpg"],
  },
  {
    author: "Сергей Шульгиненко",
    time: "5 ч назад",
    text: "Пост с четырьмя фотографиями. Проверяем сетку 2 на 2.",
    likes: 1024,
    comments: 64,
    reposts: 21,
    images: [
      "/assets/img/mock/7.jpg",
      "/assets/img/mock/8.jpg",
      "/assets/img/mock/9.jpg",
      "/assets/img/mock/10.jpg",
    ],
  },
  {
    author: "Анна Опарина",
    time: "6 ч назад",
    text: "Пост с пятью фотографиями. Две больших плитки плюс три маленьких.",
    likes: 777,
    comments: 53,
    reposts: 17,
    images: [
      "/assets/img/mock/11.jpg",
      "/assets/img/mock/12.jpg",
      "/assets/img/mock/13.jpg",
      "/assets/img/mock/14.jpg",
      "/assets/img/mock/15.jpg",
    ],
  },
  {
    author: "Михаил Иванов",
    time: "7 ч назад",
    text: "Пост с шестью и более фотографиями. Последняя плитка должна показать overlay с количеством оставшихся фото.",
    likes: 1500,
    comments: 89,
    reposts: 33,
    images: [
      "/assets/img/mock/16.jpg",
      "/assets/img/mock/17.jpg",
      "/assets/img/mock/18.jpg",
      "/assets/img/mock/19.jpg",
      "/assets/img/mock/20.jpg",
      "/assets/img/mock/21.jpg",
    ],
  },
];

const guestFeedPosts = [
  {
    author: "Команда ARIS",
    time: "только что",
    text: `Привет! Добро пожаловать в ARIS :) Мы хотели создать нашу социальную сеть в том виде, как она задумывалась изначально - с акцентом на общение со знакомыми нам людьми и поиском новых, схожих с нами по интересам.

После регистрации у тебя появится своя персональная страничка и лента.`,
    likes: 324,
    comments: 167,
    reposts: 88,
    images: [
      "/assets/img/mock/1.jpg",
      "/assets/img/mock/2.jpg",
      "/assets/img/mock/3.jpg",
      "/assets/img/mock/4.jpg",
    ],
  },

  {
    author: "Команда ARIS",
    time: "минуту назад",
    text: `В ARIS можно прикреплять к постам изображения и писать длинные тексты.

Лента может отображаться:
— по времени
— по рекомендациям ("Для вас")

Попробуй переключить режим в левом меню :)`,
    likes: 128,
    comments: 42,
    reposts: 17,
    images: ["/assets/img/mock/5.jpg", "/assets/img/mock/6.jpg"],
  },
];

/**
 * Renders the guest feed.
 * @returns {string}
 */
async function renderGuestFeed() {
  const posts = mockSession.feedMode === "for-you" ? [...guestFeedPosts].reverse() : guestFeedPosts;
  const getPosts = await getFeed();

  return `
    <section class="feed-layout__center">
      ${getPosts.posts.map(renderPostcard).join("")}
    </section>
  `;
}

/**
 * Renders the authorised feed.
 * @returns {string}
 */
async function renderAuthorisedFeed() {
  const posts = mockSession.feedMode === "for-you" ? [...mockFeedPosts].reverse() : mockFeedPosts;
  const getPosts = await getFeed();

  return `
    <section class="feed-layout__center">
      ${getPosts.posts.reverse().map(renderPostcard).join("")}
    </section>
  `;
}

/**
 * Renders the feed page.
 * @returns {string}
 */
export async function renderFeed() {
  const isAuthorised = mockSession.user !== null;

  return `
    <div class="feed-page">
      ${renderHeader()}

      <main class="feed-layout">
        <aside class="feed-layout__left">
          ${renderSidebar({ isAuthorised: mockSession.user !== null })}
        </aside>

        ${isAuthorised ? await renderAuthorisedFeed() : await renderGuestFeed()}

        <aside class="feed-layout__right">
          ${renderWidgetbar({ isAuthorised })}
        </aside>
      </main>
    </div>
  `;
}
