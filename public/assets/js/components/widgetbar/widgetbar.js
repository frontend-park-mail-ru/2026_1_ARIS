function renderStubButton(text, className) {
  return `
    <button type="button" class="${className} widgetbar-stub-button">
      ${text}
    </button>
  `;
}

function renderPopularUsersWidget() {
  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Популярные пользователи</h3>

      <div class="widgetbar-person">
        <div class="widgetbar-person__avatar" aria-hidden="true"></div>
        <a href="/login" data-open-auth-modal="login" class="widgetbar-card__username">Сергей Шульгиненко</a>
      </div>

      <div class="widgetbar-person">
        <div class="widgetbar-person__avatar" aria-hidden="true"></div>
        <a href="/login" data-open-auth-modal="login" class="widgetbar-card__username">Анна Опарина</a>
      </div>

      <div class="widgetbar-person">
        <div class="widgetbar-person__avatar" aria-hidden="true"></div>
        <a href="/login" data-open-auth-modal="login" class="widgetbar-card__username">Иван Хвостов</a>
      </div>

      <div class="widgetbar-person">
        <div class="widgetbar-person__avatar" aria-hidden="true"></div>
        <a href="/login" data-open-auth-modal="login" class="widgetbar-card__username">Ринат Байков</a>
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
        ${renderStubButton("Иван Иванов", "widgetbar-card__username")}
      </div>

      <div class="widgetbar-person">
        <div class="widgetbar-person__avatar" aria-hidden="true"></div>
        ${renderStubButton("Петр Петров", "widgetbar-card__username")}
      </div>

      <div class="widgetbar-person">
        <div class="widgetbar-person__avatar" aria-hidden="true"></div>
        ${renderStubButton("Алексей Алексеев", "widgetbar-card__username")}
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
          ${renderStubButton("Михаил Маваши", "widgetbar-card__username")}
          <span class="widgetbar-card__text"> поставил лайк вашему </span>
          ${renderStubButton("посту", "widgetbar-card__link")}
        </p>

        <p class="widgetbar-card__event">
          ${renderStubButton("Мария Иванова", "widgetbar-card__username")}
          <span class="widgetbar-card__text"> добавила </span>
          ${renderStubButton("фото", "widgetbar-card__link")}
        </p>

        <p class="widgetbar-card__event">
          ${renderStubButton("Дмитрий Соколов", "widgetbar-card__username")}
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

      <a href="/login" data-open-auth-modal="login" class="widgetbar-card__post-link">
        Веб-разработка для начинающих: как создать свою социальную сеть
      </a>

      <a href="/login" data-open-auth-modal="login" class="widgetbar-card__post-link">
        JavaScript как язык программирования в 2026?
      </a>

      <a href="/login" data-open-auth-modal="login" class="widgetbar-card__post-link">
        Лучшие вузы России
      </a>
    </section>
  `;
}

function renderAuthorisedPopularPostsWidget() {
  return `
    <section class="widgetbar-card">
      <h3 class="widgetbar-card__title">Популярные посты</h3>

      ${renderStubButton(
        "Как научиться подтягиваться 20 раз? Советы по калистенике для матерых и ...",
        "widgetbar-card__post-link",
      )}

      ${renderStubButton("Почему Rust заменяет C++", "widgetbar-card__post-link")}

      ${renderStubButton(
        "Лучшие книги по ML. Чем машинное обучение по своей сути отличается от к...",
        "widgetbar-card__post-link",
      )}
    </section>
  `;
}

function renderWeatherWidget() {
  return `
    <section class="widgetbar-card widgetbar-card--weather">
      <h3 class="widgetbar-card__title">Сегодня — Москва</h3>

      <p class="widgetbar-card__text">Днем: -7°C, ночью -17°C</p>

      <div class="widgetbar-weather-row">
        <span class="widgetbar-weather-row__icon">
          <img src="/assets/img/icons/weather-cloud.svg" alt="">
        </span>
        <span class="widgetbar-card__text">Пасмурно</span>
      </div>

      <div class="widgetbar-weather-row">
        <span class="widgetbar-weather-row__icon">
          <img src="/assets/img/icons/sunrise.svg" alt="">
        </span>
        <span class="widgetbar-card__text">Восход: 07:19</span>
      </div>

      <div class="widgetbar-weather-row">
        <span class="widgetbar-weather-row__icon">
          <img src="/assets/img/icons/sunset.svg" alt="">
        </span>
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
