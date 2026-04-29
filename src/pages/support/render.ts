/**
 * Рендер страницы поддержки.
 *
 * Содержит функции генерации HTML и обновления DOM для страницы.
 */
import type { Ticket, TicketCategory, TicketMessage } from "../../api/support";
import { renderModalCloseButton } from "../../components/modal-close/modal-close";
import { CATEGORY_LABELS, STATUS_LABELS, escapeHtml, formatDate } from "./helpers";

function renderCategoryOptions(): string {
  return (Object.entries(CATEGORY_LABELS) as [TicketCategory, string][])
    .map(([val, label]) => `<option value="${val}">${label}</option>`)
    .join("");
}

/**
 * Рендерит карточку обращения в списке тикетов.
 *
 * @param {Ticket} ticket Обращение пользователя.
 * @returns {string} HTML карточки.
 */
function renderTicketCard(ticket: Ticket): string {
  return `
    <button type="button" class="sw-ticket" data-ticket-id="${escapeHtml(ticket.id)}">
      <div class="sw-ticket__row">
        <span class="sw-ticket__cat">${escapeHtml(CATEGORY_LABELS[ticket.category] ?? ticket.category)}</span>
        <span class="sw-ticket__status sw-ticket__status--${ticket.status}">${escapeHtml(STATUS_LABELS[ticket.status] ?? ticket.status)}</span>
      </div>
      <p class="sw-ticket__title">${escapeHtml(ticket.title)}</p>
      <time class="sw-ticket__time">${formatDate(ticket.createdAt)}</time>
    </button>
  `;
}

/**
 * Рендерит список обращений пользователя.
 *
 * @param {Ticket[]} tickets Набор обращений.
 * @returns {string} HTML списка обращений.
 */
export function renderTicketsList(tickets: Ticket[]): string {
  if (!tickets.length) {
    return `<p class="sw-empty">У вас пока нет обращений.</p>`;
  }

  return tickets.map(renderTicketCard).join("");
}

/**
 * Рендерит содержимое модального окна обращения.
 *
 * @param {Ticket} ticket Выбранное обращение.
 * @returns {string} HTML содержимого модалки.
 */
export function renderTicketDetails(ticket: Ticket): string {
  return `
    <div class="sw-ticket-modal__meta">
      <span class="sw-ticket__cat">${escapeHtml(CATEGORY_LABELS[ticket.category] ?? ticket.category)}</span>
      <span class="sw-ticket__status sw-ticket__status--${ticket.status}">${escapeHtml(STATUS_LABELS[ticket.status] ?? ticket.status)}</span>
    </div>
    <h3 class="sw-ticket-modal__title">${escapeHtml(ticket.title)}</h3>
    <time class="sw-ticket-modal__time">${formatDate(ticket.createdAt)}</time>
    <p class="sw-ticket-modal__description">${escapeHtml(ticket.description)}</p>
    ${renderTicketAttachments(ticket)}
    ${renderRatingPanel(ticket)}
    ${renderTicketChatPanel()}
  `;
}

/**
 * Рендерит блок с вложениями обращения.
 *
 * @param {Ticket} ticket Обращение пользователя.
 * @returns {string} HTML блока вложений.
 */
function renderTicketAttachments(ticket: Ticket): string {
  if (!ticket.media.length) {
    return "";
  }

  return `
    <section class="sw-attachments" aria-label="Вложения">
      <h4 class="sw-attachments__title">Скриншот</h4>
      <div class="sw-attachments__grid">
        ${ticket.media
          .map(
            (media) => `
              <a class="sw-attachment" href="${escapeHtml(media.mediaURL)}" target="_blank" rel="noopener noreferrer">
                <img src="${escapeHtml(media.mediaURL)}" alt="Скриншот обращения" loading="lazy">
              </a>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

/**
 * Рендерит панель оценки закрытого обращения.
 *
 * @param {Ticket} ticket Обращение пользователя.
 * @returns {string} HTML блока оценки.
 */
export function renderRatingPanel(ticket: Ticket): string {
  if (ticket.status !== "closed") {
    return "";
  }

  if (ticket.rating) {
    return `
      <section class="sw-rating sw-rating--readonly">
        <span class="sw-rating__label">Оценка обращения</span>
        <span class="sw-rating__value">${"★".repeat(ticket.rating)}${"☆".repeat(5 - ticket.rating)}</span>
      </section>
    `;
  }

  return `
    <section class="sw-rating" data-sw-rating>
      <span class="sw-rating__label">Оцените решение</span>
      <div class="sw-rating__stars" role="group" aria-label="Оценка обращения">
        ${[1, 2, 3, 4, 5]
          .map(
            (value) => `
              <button type="button" class="sw-rating__star" data-sw-rate="${value}" aria-label="Оценить на ${value}">
                ★
              </button>
            `,
          )
          .join("")}
      </div>
      <p class="sw-rating__message" data-sw-rating-message hidden></p>
    </section>
  `;
}

/**
 * Рендерит чат внутри обращения.
 *
 * @returns {string} HTML блока переписки.
 */
function renderTicketChatPanel(): string {
  return `
    <section class="sw-chat" data-sw-chat>
      <div class="sw-chat__header">
        <h4 class="sw-chat__title">Чат по обращению</h4>
        <span class="sw-chat__status" data-sw-chat-status></span>
      </div>
      <div class="sw-chat__messages" data-sw-chat-messages>
        <p class="sw-loading">Загрузка сообщений…</p>
      </div>
      <form class="sw-chat__form" data-sw-chat-form>
        <textarea class="sw-chat__input" data-sw-chat-input rows="2" maxlength="2000" placeholder="Напишите ответ" required></textarea>
        <button type="submit" class="sw-btn sw-btn--primary" data-sw-chat-submit>Отправить</button>
      </form>
    </section>
  `;
}

/**
 * Рендерит одно сообщение в чате обращения.
 *
 * @param {TicketMessage} message Сообщение переписки.
 * @param {string} currentUserId Идентификатор текущего пользователя.
 * @returns {string} HTML сообщения.
 */
export function renderChatMessage(message: TicketMessage, currentUserId: string): string {
  const isOwn = message.authorId === currentUserId;
  const roleLabel = message.authorRole === "user" ? "" : " · поддержка";

  return `
    <article class="sw-chat-msg${isOwn ? " sw-chat-msg--own" : ""}" data-message-id="${escapeHtml(message.id)}">
      <div class="sw-chat-msg__bubble">
        <div class="sw-chat-msg__meta">
          <span>${escapeHtml(message.authorName)}${roleLabel}</span>
          <time>${formatDate(message.createdAt)}</time>
        </div>
        <p>${escapeHtml(message.text)}</p>
      </div>
    </article>
  `;
}

/**
 * Рендерит полный виджет техподдержки.
 *
 * @returns {string} HTML виджета.
 */
export function renderSupportWidget(): string {
  return `
    <div class="support-widget" data-support-page>
      <header class="sw-header">
        <div class="sw-header__logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="17" r="1" fill="currentColor"/>
          </svg>
          <span>Техподдержка</span>
        </div>
        <button type="button" class="sw-header__close" data-sw-close aria-label="Закрыть">
          ×
        </button>
      </header>

      <nav class="sw-tabs" role="tablist">
        <button
          class="sw-tab sw-tab--active"
          role="tab"
          aria-selected="true"
          data-sw-tab="new"
        >Новое обращение</button>
        <button
          class="sw-tab"
          role="tab"
          aria-selected="false"
          data-sw-tab="my"
        >Мои обращения</button>
      </nav>

      <div class="sw-panels">
        <div class="sw-panel sw-panel--active" data-sw-panel="new" role="tabpanel">
          <form class="sw-form" data-sw-form novalidate>
            <div class="sw-form__field">
              <label class="sw-form__label" for="sw-category">Категория</label>
              <select id="sw-category" name="category" class="sw-form__select" required>
                ${renderCategoryOptions()}
              </select>
            </div>

            <div class="sw-form__field">
              <label class="sw-form__label" for="sw-login">Логин</label>
              <input
                id="sw-login"
                name="login"
                type="text"
                class="sw-form__input"
                placeholder="Введите логин"
                autocomplete="username"
                maxlength="255"
                required
              >
            </div>

            <div class="sw-form__field">
              <label class="sw-form__label" for="sw-email">E-mail <span class="sw-form__optional">контактный для связи</span></label>
              <input
                id="sw-email"
                name="email"
                type="email"
                class="sw-form__input"
                placeholder="name@example.com"
                inputmode="email"
                autocomplete="email"
                maxlength="255"
                required
                data-sw-email
              >
            </div>

            <div class="sw-form__field">
              <label class="sw-form__label" for="sw-title">Заголовок</label>
              <input
                id="sw-title"
                name="title"
                type="text"
                class="sw-form__input"
                placeholder="Кратко опишите проблему"
                maxlength="200"
                required
              >
            </div>

            <div class="sw-form__field">
              <label class="sw-form__label" for="sw-desc">Описание</label>
              <textarea
                id="sw-desc"
                name="description"
                class="sw-form__textarea"
                placeholder="Подробно опишите проблему или предложение"
                maxlength="5000"
                rows="3"
                required
              ></textarea>
            </div>

            <div class="sw-form__field">
              <label class="sw-form__label">Скриншот <span class="sw-form__optional">(необязательно)</span></label>
              <div class="sw-upload" data-sw-upload>
                <input
                  type="file"
                  id="sw-screenshot"
                  accept="image/*"
                  class="sw-upload__input"
                  data-sw-file-input
                >
                <label for="sw-screenshot" class="sw-upload__label" data-sw-upload-label>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="17 8 12 3 7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                  <span>Прикрепить скриншот</span>
                </label>
                <div class="sw-upload__preview" data-sw-preview hidden>
                  <img class="sw-upload__preview-img" data-sw-preview-img src="" alt="Предпросмотр">
                  <button type="button" class="sw-upload__remove" data-sw-remove-file aria-label="Удалить файл">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="sw-form__footer">
              <p class="sw-form__error" data-sw-error hidden></p>
              <button type="submit" class="sw-btn sw-btn--primary" data-sw-submit>
                Отправить
              </button>
            </div>
          </form>

          <div class="sw-success" data-sw-success hidden>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="#4a51d0" stroke-width="2"/>
              <path d="M8 12l3 3 5-5" stroke="#4a51d0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p>Обращение отправлено! Мы свяжемся с вами в ближайшее время.</p>
            <button type="button" class="sw-btn sw-btn--ghost" data-sw-new-ticket>
              Создать ещё одно
            </button>
          </div>
        </div>

        <div class="sw-panel" data-sw-panel="my" role="tabpanel" hidden>
          <div class="sw-tickets-wrap" data-sw-tickets>
            <p class="sw-loading">Загрузка…</p>
          </div>
        </div>
      </div>

      <div class="sw-ticket-modal" data-sw-ticket-modal hidden>
        <div class="sw-ticket-modal__backdrop" data-sw-ticket-close></div>
        <section class="sw-ticket-modal__dialog" role="dialog" aria-modal="true" aria-label="Обращение">
          ${renderModalCloseButton({
            className: "sw-ticket-modal__close",
            attributes: "data-sw-ticket-close",
          })}
          <div class="sw-ticket-modal__body" data-sw-ticket-modal-body></div>
        </section>
      </div>
    </div>
  `;
}
