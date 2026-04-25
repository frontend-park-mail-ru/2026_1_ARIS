import {
  createTicket,
  getMyTickets,
  type Ticket,
  type TicketCategory,
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
    <article class="sw-ticket" data-ticket-id="${escapeHtml(ticket.id)}">
      <div class="sw-ticket__row">
        <span class="sw-ticket__cat">${escapeHtml(CATEGORY_LABELS[ticket.category] ?? ticket.category)}</span>
        <span class="sw-ticket__status sw-ticket__status--${ticket.status}">${escapeHtml(STATUS_LABELS[ticket.status] ?? ticket.status)}</span>
      </div>
      <p class="sw-ticket__title">${escapeHtml(ticket.title)}</p>
      <time class="sw-ticket__time">${formatDate(ticket.createdAt)}</time>
    </article>
  `;
}

function renderTicketsList(tickets: Ticket[]): string {
  if (!tickets.length) {
    return `<p class="sw-empty">У вас пока нет обращений.</p>`;
  }
  return tickets.map(renderTicketCard).join("");
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

  let selectedFile: File | null = null;
  let resolvedEmail = (user.email ?? "").trim();

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
        void loadMyTickets(root);
      }
    });
  });

  // --- отправка формы ---
  form?.addEventListener("submit", async (event: Event) => {
    event.preventDefault();

    if (!form || !submitBtn || !errorEl || !successEl) return;

    const formData = new FormData(form);
    const category = formData.get("category") as TicketCategory;
    const email = ((formData.get("email") as string) ?? resolvedEmail).trim();
    const title = ((formData.get("title") as string) ?? "").trim();
    const description = ((formData.get("description") as string) ?? "").trim();

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

async function loadMyTickets(root: Document | HTMLElement): Promise<void> {
  const wrap = root.querySelector<HTMLElement>("[data-sw-tickets]");
  if (!wrap) return;

  wrap.innerHTML = `<p class="sw-loading">Загрузка…</p>`;

  try {
    const tickets = await getMyTickets();
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
