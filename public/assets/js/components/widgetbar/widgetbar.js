function renderPopularUsersWidget() {
  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Популярные пользователи</h3>

      <div class="widgetbar-person">
        <div class="widgetbar-person__avatar" aria-hidden="true"></div>
        <a href="/login" data-link class="widgetbar-card__username">Сергей Шульгиненко</a>
      </div>

      <div class="widgetbar-person">
        <div class="widgetbar-person__avatar" aria-hidden="true"></div>
        <a href="/login" data-link class="widgetbar-card__username">Анна Опарина</a>
      </div>

      <div class="widgetbar-person">
        <div class="widgetbar-person__avatar" aria-hidden="true"></div>
        <a href="/login" data-link class="widgetbar-card__username">Иван Хвостов</a>
      </div>

      <div class="widgetbar-person">
        <div class="widgetbar-person__avatar" aria-hidden="true"></div>
        <a href="/login" data-link class="widgetbar-card__username">Ринат Байков</a>
      </div>
    </section>
  `;
}

function renderKnownPeopleWidget() {
  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Возможно, вы знакомы:</h3>

      <div class="widgetbar-person">
        <div class="widgetbar-person__avatar" aria-hidden="true"></div>
        <a href="/login" data-link class="widgetbar-card__username">Иван Иванов</a>
      </div>

      <div class="widgetbar-person">
        <div class="widgetbar-person__avatar" aria-hidden="true"></div>
        <a href="/login" data-link class="widgetbar-card__username">Петр Петров</a>
      </div>

      <div class="widgetbar-person">
        <div class="widgetbar-person__avatar" aria-hidden="true"></div>
        <a href="/login" data-link class="widgetbar-card__username">Алексей Алексеев</a>
      </div>
    </section>
  `;
}

function renderEventsWidget() {
  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Последние события</h3>

      <div class="widgetbar-card__events">
        <p class="widgetbar-card__event">
          <a href="/login" data-link class="widgetbar-card__username">Михаил Маваши</a>
          <span class="widgetbar-card__text"> поставил лайк вашему </span>
          <a href="/login" data-link class="widgetbar-card__link">посту</a>
        </p>

        <p class="widgetbar-card__event">
          <a href="/login" data-link class="widgetbar-card__username">Мария Иванова</a>
          <span class="widgetbar-card__text"> добавила </span>
          <a href="/login" data-link class="widgetbar-card__link">фото</a>
        </p>

        <p class="widgetbar-card__event">
          <a href="/login" data-link class="widgetbar-card__username">Дмитрий Соколов</a>
          <span class="widgetbar-card__text"> подписался на вас</span>
        </p>
      </div>
    </section>
  `;
}

function renderGuestPopularPostsWidget() {
  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Популярные посты</h3>

      <a href="/login" data-link class="widgetbar-card__post-link">
        Веб-разработка для начинающих: как создать свою социальную сеть
      </a>

      <a href="/login" data-link class="widgetbar-card__post-link">
        JavaScript как язык программирования в 2026?
      </a>

      <a href="/login" data-link class="widgetbar-card__post-link">
        Лучшие вузы России
      </a>
    </section>
  `;
}

function renderAuthorisedPopularPostsWidget() {
  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Популярные посты</h3>

      <a href="/login" data-link class="widgetbar-card__post-link">
        Как научиться подтягиваться 20 раз? Советы по калистенике для матерых и ...
      </a>

      <a href="/login" data-link class="widgetbar-card__post-link">
        Почему Rust заменяет C++
      </a>

      <a href="/login" data-link class="widgetbar-card__post-link">
        Лучшие книги по ML. Чем машинное обучение по своей сути отличается от к...
      </a>
    </section>
  `;
}

function renderWeatherWidget() {
  return `
    <section class="widgetbar-card widgetbar-card--weather">
      <h3 class="widgetbar-card__title">Сегодня — Москва</h3>

      <p class="widgetbar-card__text">Днем: -7°C, ночью -17°C</p>

      <div class="widgetbar-weather-row">
        <span class="widgetbar-weather-row__icon">☁</span>
        <span class="widgetbar-card__text">Пасмурно</span>
      </div>

      <div class="widgetbar-weather-row">
        <span class="widgetbar-weather-row__icon">☀</span>
        <span class="widgetbar-card__text">Восход: 07:19</span>
      </div>

      <div class="widgetbar-weather-row">
        <span class="widgetbar-weather-row__icon">☾</span>
        <span class="widgetbar-card__text">Заход: 18:13</span>
      </div>
    </section>
  `;
}

/**
 * Renders the widgetbar.
 * @returns {string}
 */
export function renderWidgetbar({ isAuthorised }) {
  if (isAuthorised) {
    return `
    <aside class="widgetbar">
      ${renderKnownPeopleWidget()}
      ${renderEventsWidget()}
      ${renderAuthorisedPopularPostsWidget()}
      ${renderWeatherWidget()}
    </aside>
  `;
  }
  return `
    <aside class="widgetbar">
      ${renderPopularUsersWidget()}
      ${renderGuestPopularPostsWidget()}
      ${renderWeatherWidget()}
    </aside>
  `;
}
