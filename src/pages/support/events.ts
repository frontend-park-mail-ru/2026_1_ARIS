/**
 * Обработчики событий страницы поддержки.
 *
 * Содержит пользовательские сценарии и реакцию интерфейса на действия пользователя.
 */
import {
  createTicket,
  getMyTickets,
  getTicketById,
  getTicketMessages,
  rateTicket,
  sendTicketMessage,
  subscribeToTicketMessages,
  type Ticket,
  type TicketCategory,
  type TicketMessage,
} from "../../api/support";
import { getMyProfile } from "../../api/profile";
import { getSessionUser } from "../../state/session";
import { hideError, showError } from "./helpers";
import {
  renderChatMessage,
  renderRatingPanel,
  renderTicketDetails,
  renderTicketsList,
} from "./render";

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

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

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
    if (!file || !errorEl) return;

    if (!file.type.startsWith("image/")) {
      showError(errorEl, "Можно прикрепить только изображение.");
      fileInput.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showError(errorEl, "Файл слишком большой. Максимум — 5 МБ.");
      fileInput.value = "";
      return;
    }

    hideError(errorEl);
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
      : `<p class="sw-empty sw-empty--compact" data-sw-chat-empty>Список пуст.</p>`;
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
      onError: () => setChatStatus(""),
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
