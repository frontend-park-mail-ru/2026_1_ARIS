import {
  createTicket,
  getTicketById,
  getMyTickets,
  getTicketMessages,
  rateTicket,
  sendTicketMessage,
  subscribeToTicketMessages,
  type Ticket,
  type TicketCategory,
  type TicketMessage,
  type TicketStatus,
} from "../../api/support";
import { getMyProfile } from "../../api/profile";
import { getSessionUser, initSession } from "../../state/session";

// ---------------------------------------------------------------------------
// Вспомогательные функции
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: "Баг",
  feature_request: "Предложение",
  complaint: "Жалоба",
  question: "Вопрос",
  other: "Другое",
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Открыто",
  in_progress: "В работе",
  waiting_user: "Ожидает вас",
  closed: "Закрыто",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Рендер
// ---------------------------------------------------------------------------

function renderCategoryOptions(): string {
  return (Object.entries(CATEGORY_LABELS) as [TicketCategory, string][])
    .map(([val, label]) => `<option value="${val}">${label}</option>`)
    .join("");
}

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

function renderTicketsList(tickets: Ticket[]): string {
  if (!tickets.length) {
    return `<p class="sw-empty">У вас пока нет обращений.</p>`;
  }
  return tickets.map(renderTicketCard).join("");
}

function renderTicketDetails(ticket: Ticket): string {
  return `
    <div class="sw-ticket-modal__meta">
      <span class="sw-ticket__cat">${escapeHtml(CATEGORY_LABELS[ticket.category] ?? ticket.category)}</span>
      <span class="sw-ticket__status sw-ticket__status--${ticket.status}">${escapeHtml(STATUS_LABELS[ticket.status] ?? ticket.status)}</span>
    </div>
    <h3 class="sw-ticket-modal__title">${escapeHtml(ticket.title)}</h3>
    <time class="sw-ticket-modal__time">${formatDate(ticket.createdAt)}</time>
    <p class="sw-ticket-modal__description">${escapeHtml(ticket.description)}</p>
    ${renderRatingPanel(ticket)}
    ${renderTicketChatPanel()}
  `;
}

function renderRatingPanel(ticket: Ticket): string {
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

function renderChatMessage(message: TicketMessage, currentUserId: string): string {
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
        <!-- Форма -->
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

        <!-- Список обращений -->
        <div class="sw-panel" data-sw-panel="my" role="tabpanel" hidden>
          <div class="sw-tickets-wrap" data-sw-tickets>
            <p class="sw-loading">Загрузка…</p>
          </div>
        </div>
      </div>

      <div class="sw-ticket-modal" data-sw-ticket-modal hidden>
        <div class="sw-ticket-modal__backdrop" data-sw-ticket-close></div>
        <section class="sw-ticket-modal__dialog" role="dialog" aria-modal="true" aria-label="Обращение">
          <button type="button" class="sw-ticket-modal__close" data-sw-ticket-close aria-label="Закрыть">
            ×
          </button>
          <div class="sw-ticket-modal__body" data-sw-ticket-modal-body></div>
        </section>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Инициализация
// ---------------------------------------------------------------------------

export async function initSupport(root: Document | HTMLElement): Promise<void> {
  const user = getSessionUser();
  if (!user) return;

  const closeButton = root.querySelector<HTMLButtonElement>("[data-sw-close]");
  const emailInput = root.querySelector<HTMLInputElement>("[data-sw-email]");
  const form = root.querySelector<HTMLFormElement>("[data-sw-form]");
  const submitBtn = root.querySelector<HTMLButtonElement>("[data-sw-submit]");
  const errorEl = root.querySelector<HTMLElement>("[data-sw-error]");
  const successEl = root.querySelector<HTMLElement>("[data-sw-success]");
  const newTickBtn = root.querySelector<HTMLButtonElement>("[data-sw-new-ticket]");
  const fileInput = root.querySelector<HTMLInputElement>("[data-sw-file-input]");
  const previewEl = root.querySelector<HTMLElement>("[data-sw-preview]");
  const previewImg = root.querySelector<HTMLImageElement>("[data-sw-preview-img]");
  const removeBtn = root.querySelector<HTMLButtonElement>("[data-sw-remove-file]");
  const uploadLabel = root.querySelector<HTMLElement>("[data-sw-upload-label]");
  const ticketsWrap = root.querySelector<HTMLElement>("[data-sw-tickets]");
  const ticketModal = root.querySelector<HTMLElement>("[data-sw-ticket-modal]");
  const ticketModalBody = root.querySelector<HTMLElement>("[data-sw-ticket-modal-body]");

  let selectedFile: File | null = null;
  let resolvedEmail = (user.email ?? "").trim();
  let currentTickets: Ticket[] = [];
  let unsubscribeTicketMessages: (() => void) | null = null;
  let activeTicketId = "";
  let activeTicketMessageIds = new Set<string>();

  closeButton?.addEventListener("click", () => {
    window.parent?.postMessage({ type: "support-widget-close" }, window.location.origin);
  });

  const syncIdentityFields = (): void => {
    if (emailInput) {
      emailInput.value = resolvedEmail;
    }
  };

  syncIdentityFields();

  if (!resolvedEmail) {
    try {
      const profile = await getMyProfile();
      resolvedEmail = (profile.email ?? "").trim();
      syncIdentityFields();
    } catch (error) {
      console.warn("[support] failed to preload contact email", error);
    }
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  function setPreview(file: File): void {
    const url = URL.createObjectURL(file);
    if (previewImg) previewImg.src = url;
    if (previewEl) previewEl.hidden = false;
    if (uploadLabel) uploadLabel.hidden = true;
  }

  function clearPreview(): void {
    if (previewImg) {
      URL.revokeObjectURL(previewImg.src);
      previewImg.src = "";
    }
    if (previewEl) previewEl.hidden = true;
    if (uploadLabel) uploadLabel.hidden = false;
    if (fileInput) fileInput.value = "";
    selectedFile = null;
  }

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError(errorEl!, "Можно прикрепить только изображение.");
      fileInput.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showError(errorEl!, "Файл слишком большой. Максимум — 5 МБ.");
      fileInput.value = "";
      return;
    }
    hideError(errorEl!);
    selectedFile = file;
    setPreview(file);
  });

  removeBtn?.addEventListener("click", () => clearPreview());

  const cleanupTicketSocket = (): void => {
    unsubscribeTicketMessages?.();
    unsubscribeTicketMessages = null;
  };

  const closeTicketModal = (): void => {
    if (!ticketModal || !ticketModalBody) return;
    cleanupTicketSocket();
    activeTicketId = "";
    activeTicketMessageIds = new Set<string>();
    ticketModal.hidden = true;
    ticketModalBody.innerHTML = "";
  };

  const appendTicketMessage = (message: TicketMessage): void => {
    if (
      !ticketModalBody ||
      (message.ticketId && message.ticketId !== activeTicketId) ||
      activeTicketMessageIds.has(message.id)
    ) {
      return;
    }

    activeTicketMessageIds.add(message.id);
    const messagesEl = ticketModalBody.querySelector<HTMLElement>("[data-sw-chat-messages]");
    if (!messagesEl) return;

    const emptyEl = messagesEl.querySelector("[data-sw-chat-empty]");
    emptyEl?.remove();
    messagesEl.insertAdjacentHTML("beforeend", renderChatMessage(message, user.id));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const renderTicketMessages = (messages: TicketMessage[]): void => {
    if (!ticketModalBody) return;

    const messagesEl = ticketModalBody.querySelector<HTMLElement>("[data-sw-chat-messages]");
    if (!messagesEl) return;

    activeTicketMessageIds = new Set(messages.map((message) => message.id));
    messagesEl.innerHTML = messages.length
      ? messages.map((message) => renderChatMessage(message, user.id)).join("")
      : `<p class="sw-empty sw-empty--compact" data-sw-chat-empty>Сообщений пока нет.</p>`;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const setChatStatus = (message: string): void => {
    const statusEl = ticketModalBody?.querySelector<HTMLElement>("[data-sw-chat-status]");
    if (statusEl) {
      statusEl.textContent = message;
    }
  };

  const bindTicketModalControls = (ticket: Ticket): void => {
    if (!ticketModalBody) return;

    ticketModalBody.querySelectorAll<HTMLButtonElement>("[data-sw-rate]").forEach((button) => {
      button.addEventListener("click", async () => {
        const rating = Number(button.getAttribute("data-sw-rate") ?? "0");
        const messageEl = ticketModalBody.querySelector<HTMLElement>("[data-sw-rating-message]");
        if (!rating) return;

        button
          .closest<HTMLElement>("[data-sw-rating]")
          ?.querySelectorAll<HTMLButtonElement>("[data-sw-rate]")
          .forEach((item) => {
            item.disabled = true;
          });

        try {
          await rateTicket(ticket.id, { rating });
          currentTickets = currentTickets.map((item) =>
            item.id === ticket.id ? { ...item, rating } : item,
          );
          const ratingEl = ticketModalBody.querySelector<HTMLElement>("[data-sw-rating]");
          if (ratingEl) {
            ratingEl.outerHTML = renderRatingPanel({ ...ticket, rating });
          }
        } catch (error) {
          if (messageEl) {
            messageEl.textContent = "Не удалось сохранить оценку.";
            messageEl.hidden = false;
          }
          button
            .closest<HTMLElement>("[data-sw-rating]")
            ?.querySelectorAll<HTMLButtonElement>("[data-sw-rate]")
            .forEach((item) => {
              item.disabled = false;
            });
          console.error("[support] rate ticket failed", error);
        }
      });
    });

    const chatForm = ticketModalBody.querySelector<HTMLFormElement>("[data-sw-chat-form]");
    const chatInput = ticketModalBody.querySelector<HTMLTextAreaElement>("[data-sw-chat-input]");
    const chatSubmit = ticketModalBody.querySelector<HTMLButtonElement>("[data-sw-chat-submit]");

    chatForm?.addEventListener("submit", async (event: Event) => {
      event.preventDefault();
      const text = (chatInput?.value ?? "").trim();
      if (!text || !chatInput || !chatSubmit) return;

      chatSubmit.disabled = true;
      setChatStatus("");

      try {
        const message = await sendTicketMessage(ticket.id, { text });
        appendTicketMessage({ ...message, ticketId: message.ticketId || ticket.id });
        chatInput.value = "";
      } catch (error) {
        setChatStatus("Не удалось отправить.");
        console.error("[support] send message failed", error);
      } finally {
        chatSubmit.disabled = false;
      }
    });
  };

  const openTicketModal = async (ticketId: string): Promise<void> => {
    if (!ticketModal || !ticketModalBody) return;

    cleanupTicketSocket();
    activeTicketId = ticketId;
    activeTicketMessageIds = new Set<string>();

    const cachedTicket = currentTickets.find((ticket) => ticket.id === ticketId);
    if (cachedTicket) {
      ticketModalBody.innerHTML = renderTicketDetails(cachedTicket);
      bindTicketModalControls(cachedTicket);
    } else {
      ticketModalBody.innerHTML = `<p class="sw-loading">Загрузка…</p>`;
    }
    ticketModal.hidden = false;

    let openedTicket = cachedTicket ?? null;

    if (!cachedTicket?.description) {
      try {
        const freshTicket = await getTicketById(ticketId);
        openedTicket = freshTicket;
        currentTickets = currentTickets.some((ticket) => ticket.id === ticketId)
          ? currentTickets.map((ticket) => (ticket.id === ticketId ? freshTicket : ticket))
          : [...currentTickets, freshTicket];
        ticketModalBody.innerHTML = renderTicketDetails(freshTicket);
        bindTicketModalControls(freshTicket);
      } catch (error) {
        ticketModalBody.innerHTML = `
          <p class="sw-empty">Не удалось загрузить детали обращения.</p>
        `;
        console.error("[support] load ticket failed", error);
        return;
      }
    }

    if (!openedTicket) {
      return;
    }

    try {
      const messages = await getTicketMessages(openedTicket.id);
      if (activeTicketId !== openedTicket.id) return;
      renderTicketMessages(messages);
    } catch (error) {
      renderTicketMessages([]);
      setChatStatus("История недоступна.");
      console.error("[support] load messages failed", error);
    }

    unsubscribeTicketMessages = subscribeToTicketMessages(openedTicket.id, {
      onMessage: appendTicketMessage,
      onError: () => setChatStatus("Live-обновления недоступны."),
    });
  };

  root.querySelectorAll<HTMLElement>("[data-sw-ticket-close]").forEach((node) => {
    node.addEventListener("click", () => closeTicketModal());
  });

  ticketsWrap?.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const ticketButton = target.closest<HTMLElement>("[data-ticket-id]");
    if (!ticketButton) return;

    const ticketId = ticketButton.getAttribute("data-ticket-id");
    if (!ticketId) return;

    void openTicketModal(ticketId);
  });

  const updateTickets = (tickets: Ticket[]): void => {
    currentTickets = tickets;
  };

  // --- переключение вкладок ---
  root.querySelectorAll<HTMLButtonElement>("[data-sw-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetPanel = tab.getAttribute("data-sw-tab");

      root.querySelectorAll("[data-sw-tab]").forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle("sw-tab--active", isActive);
        t.setAttribute("aria-selected", String(isActive));
      });

      root.querySelectorAll<HTMLElement>("[data-sw-panel]").forEach((panel) => {
        const isTarget = panel.getAttribute("data-sw-panel") === targetPanel;
        panel.hidden = !isTarget;
        panel.classList.toggle("sw-panel--active", isTarget);
      });

      if (targetPanel === "my") {
        void loadMyTickets(root, updateTickets);
      }
    });
  });

  // --- отправка формы ---
  form?.addEventListener("submit", async (event: Event) => {
    event.preventDefault();

    if (!form || !submitBtn || !errorEl || !successEl) return;

    const formData = new FormData(form);
    const category = formData.get("category") as TicketCategory;
    const login = ((formData.get("login") as string) ?? "").trim();
    const email = ((formData.get("email") as string) ?? resolvedEmail).trim();
    const title = ((formData.get("title") as string) ?? "").trim();
    const description = ((formData.get("description") as string) ?? "").trim();

    if (!login) {
      showError(errorEl, "Укажите логин.");
      return;
    }

    if (!email) {
      showError(errorEl, "Укажите контактный e-mail.");
      return;
    }

    if (!title || title.length < 3) {
      showError(errorEl, "Заголовок должен содержать не менее 3 символов.");
      return;
    }
    if (!description || description.length < 10) {
      showError(errorEl, "Описание должно содержать не менее 10 символов.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Отправка…";
    hideError(errorEl);

    try {
      await createTicket({
        category,
        login,
        email,
        title,
        description,
        screenshot: selectedFile,
      });
      form.reset();
      clearPreview();
      syncIdentityFields();
      form.hidden = true;
      successEl.hidden = false;
    } catch (err) {
      showError(errorEl, "Не удалось отправить обращение. Попробуйте ещё раз.");
      console.error("[support] create failed", err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Отправить";
    }
  });

  // --- кнопка "Создать ещё" ---
  newTickBtn?.addEventListener("click", () => {
    if (!form || !successEl) return;
    successEl.hidden = true;
    form.hidden = false;
    clearPreview();
  });
}

async function loadMyTickets(
  root: Document | HTMLElement,
  onLoaded?: (tickets: Ticket[]) => void,
): Promise<void> {
  const wrap = root.querySelector<HTMLElement>("[data-sw-tickets]");
  if (!wrap) return;

  wrap.innerHTML = `<p class="sw-loading">Загрузка…</p>`;

  try {
    const tickets = await getMyTickets();
    onLoaded?.(tickets);
    wrap.innerHTML = renderTicketsList(tickets);
  } catch (err) {
    wrap.innerHTML = `<p class="sw-empty">Не удалось загрузить обращения.</p>`;
    console.error("[support] load tickets failed", err);
  }
}

function showError(el: HTMLElement, msg: string): void {
  el.textContent = msg;
  el.hidden = false;
}

function hideError(el: HTMLElement): void {
  el.textContent = "";
  el.hidden = true;
}

// ---------------------------------------------------------------------------
// Точка входа для самостоятельной загрузки в iframe
// ---------------------------------------------------------------------------

export async function initSupportPage(): Promise<void> {
  await initSession();
  const root = document.getElementById("app");
  if (root) {
    await initSupport(root);
  }
}
