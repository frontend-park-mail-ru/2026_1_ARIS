import { renderHeader } from "../../components/header/header.js";
import { renderSidebar } from "../../components/sidebar/sidebar.js";
import { renderWidgetbar } from "../../components/widgetbar/widgetbar.js";
import { mockSession } from "../../mock/session.js";
import { renderPostcard } from "../../components/postcard/postcard.js";

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
    text: "Пост с одной фотографией. Картинка должна занимать весь медиаблок.",
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
    images: ["/assets/img/4.jpg", "/assets/img/5.jpg", "/assets/img/6.jpg"],
  },
  {
    author: "Сергей Шульгиненко",
    time: "5 ч назад",
    text: "Пост с четырьмя фотографиями. Проверяем сетку 2 на 2.",
    likes: 1024,
    comments: 64,
    reposts: 21,
    images: ["/assets/img/7.jpg", "/assets/img/8.jpg", "/assets/img/9.jpg", "/assets/img/10.jpg"],
  },
  {
    author: "Анна Опарина",
    time: "6 ч назад",
    text: "Пост с пятью фотографиями. Две больших плитки плюс три маленьких.",
    likes: 777,
    comments: 53,
    reposts: 17,
    images: [
      "/assets/img/11.jpg",
      "/assets/img/12.jpg",
      "/assets/img/13.jpg",
      "/assets/img/14.jpg",
      "/assets/img/15.jpg",
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
      "/assets/img/16.jpg",
      "/assets/img/17.jpg",
      "/assets/img/18.jpg",
      "/assets/img/19.jpg",
      "/assets/img/20.jpg",
      "/assets/img/21.jpg",
    ],
  },
];

/**
 * Renders the guest feed.
 * @returns {string}
 */
function renderGuestFeed() {
  return `
    <section class="feed-layout__center">
      ${renderPostcard({
        author: "Команда ARIS",
        time: "1 ч назад",
        text: `Привет! Добро пожаловать в ARIS :) Мы хотели создать нашу социальную сеть в том виде, как она задумывалась изначально - с акцентом на общение со знакомыми нам людьми и поиском новых, схожих с нами по интересам.

Сейчас ты видишь приветственное сообщение от нашей команды, но после <a href="/register" data-open-auth-modal="register" class="postcard__text-link">регистрации</a> у тебя будет своя собственная персональная страничка и лента в таком же виде, но уже наполненная интересными лично тебе.

Ты сможешь сам выбрать, в каком формате тебе интереснее смотреть ленту. Мы можем показывать тебе посты в том порядке, как они публиковались, но ты также можешь выбрать режим рекомендаций (иконка “Для Вас” в левом столбце), и тогда мы подберем сами что-нибудь интересное лично для тебя :)

К постам можно прикреплять изображения. Для примера, в этом сообщении ниже мы прикрепили 4 фотографии.

Как будешь готов - можем переходить к <a href="/register" data-open-auth-modal="register" class="postcard__text-link">регистрации</a>. Обещаем, что это не займет много времени!

А возможно, у тебя уже есть персональная страничка на нашем сайте? :) Тогда мы можем перейти сразу к <a href="/login" data-open-auth-modal="login" class="postcard__text-link">авторизации</a>. Это будет еще быстрее.

Чувствуй себя как дома,

Команда ARIS.`,
        likes: 324,
        comments: 167,
        reposts: 88,
        images: [
          "/assets/img/mock/1.jpg",
          "/assets/img/mock/2.jpg",
          "/assets/img/mock/3.jpg",
          "/assets/img/mock/4.jpg",
        ],
      })}
    </section>
  `;
}

/**
 * Renders the authorised feed.
 * @returns {string}
 */
function renderAuthorisedFeed() {
  return `
    <section class="feed-layout__center">
      ${mockFeedPosts.map(renderPostcard).join("")}
    </section>
  `;
}

/**
 * Renders the feed page.
 * @returns {string}
 */
export function renderFeed() {
  const isAuthorised = mockSession.user !== null;

  return `
    <div class="feed-page">
      ${renderHeader()}

      <main class="feed-layout">
        <aside class="feed-layout__left">
          ${renderSidebar({ isAuthorised: mockSession.user !== null })}
        </aside>

        ${isAuthorised ? renderAuthorisedFeed() : renderGuestFeed()}

        <aside class="feed-layout__right">
          ${renderWidgetbar({ isAuthorised })}
        </aside>
      </main>
    </div>
  `;
}
