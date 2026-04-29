/**
 * Обработчики событий страницы админки поддержки.
 *
 * Содержит пользовательские сценарии и реакцию интерфейса на действия пользователя.
 */
import {
  assignTicket,
  escalateTicket,
  getAllTickets,
  getTicketById,
  getTicketMessages,
  sendTicketMessage,
  subscribeToTicketMessages,
  updateTicketStatus,
  type Ticket,
  type TicketCategory,
  type TicketFilter,
  type TicketLine,
  type TicketMessage,
  type TicketStatus,
} from "../../api/support";
import { getSessionUser } from "../../state/session";
import { canViewAdminPanel } from "../../state/role";
import { escapeHtml } from "./helpers";
import { renderChatMessage, renderTicketList, renderTicketPanel } from "./render";

export async function initSupportAdmin(root: HTMLElement): Promise<void> {
  if (!canViewAdminPanel()) return;

  const user = getSessionUser();
  if (!user) return;

  const filtersForm = root.querySelector<HTMLFormElement>("[data-sa-filters]");
  const statusFilter = root.querySelector<HTMLSelectElement>("[data-sa-filter-status]");
  const categoryFilter = root.querySelector<HTMLSelectElement>("[data-sa-filter-category]");
  const lineFilter = root.querySelector<HTMLSelectElement>("[data-sa-filter-line]");
  const listEl = root.querySelector<HTMLElement>("[data-sa-ticket-list]");
  const panelEl = root.querySelector<HTMLElement>("[data-sa-ticket-panel]");

  let tickets: Ticket[] = [];
  let activeTicketId = "";
  let messageIds = new Set<string>();
  let unsubscribeMessages: (() => void) | null = null;

  const cleanupSocket = (): void => {
    unsubscribeMessages?.();
    unsubscribeMessages = null;
  };

  const setPanelMessage = (message: string): void => {
    if (panelEl) {
      panelEl.innerHTML = `<p class="sa-empty">${escapeHtml(message)}</p>`;
    }
  };

  const getFilters = (): TicketFilter => {
    const filter: TicketFilter = {};
    const status = statusFilter?.value as TicketStatus | "";
    const category = categoryFilter?.value as TicketCategory | "";
    const lineValue = lineFilter?.value;

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (lineValue === "1" || lineValue === "2") filter.line = Number(lineValue) as TicketLine;
    return filter;
  };

  const refreshList = async (): Promise<void> => {
    if (!listEl) return;

    listEl.innerHTML = `<p class="sa-empty">Загрузка тикетов…</p>`;
    try {
      tickets = await getAllTickets(getFilters());
      listEl.innerHTML = renderTicketList(tickets, activeTicketId);
    } catch (error) {
      listEl.innerHTML = `<p class="sa-empty">Не удалось загрузить тикеты.</p>`;
      console.error("[support-admin] load tickets failed", error);
    }
  };

  const appendMessage = (message: TicketMessage): void => {
    if (
      !panelEl ||
      (message.ticketId && message.ticketId !== activeTicketId) ||
      messageIds.has(message.id)
    ) {
      return;
    }

    const messagesEl = panelEl.querySelector<HTMLElement>("[data-sa-chat-messages]");
    if (!messagesEl) return;

    messageIds.add(message.id);
    messagesEl.querySelector("[data-sa-chat-empty]")?.remove();
    messagesEl.insertAdjacentHTML("beforeend", renderChatMessage(message, user.id));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const renderMessages = (messages: TicketMessage[]): void => {
    const messagesEl = panelEl?.querySelector<HTMLElement>("[data-sa-chat-messages]");
    if (!messagesEl) return;

    messageIds = new Set(messages.map((message) => message.id));
    messagesEl.innerHTML = messages.length
      ? messages.map((message) => renderChatMessage(message, user.id)).join("")
      : `<p class="sa-empty" data-sa-chat-empty>Сообщений пока нет.</p>`;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const setChatStatus = (message: string): void => {
    const statusEl = panelEl?.querySelector<HTMLElement>("[data-sa-chat-status]");
    if (statusEl) statusEl.textContent = message;
  };

  const setControlsMessage = (message: string): void => {
    const messageEl = panelEl?.querySelector<HTMLElement>("[data-sa-controls-message]");
    if (!messageEl) return;
    messageEl.textContent = message;
    messageEl.hidden = false;
  };

  const bindPanelControls = (ticket: Ticket): void => {
    const statusSelect = panelEl?.querySelector<HTMLSelectElement>("[data-sa-status]");
    const agentInput = panelEl?.querySelector<HTMLInputElement>("[data-sa-agent-id]");
    const assignButton = panelEl?.querySelector<HTMLButtonElement>("[data-sa-assign]");
    const escalateButton = panelEl?.querySelector<HTMLButtonElement>("[data-sa-escalate]");
    const chatForm = panelEl?.querySelector<HTMLFormElement>("[data-sa-chat-form]");
    const chatInput = panelEl?.querySelector<HTMLTextAreaElement>("[data-sa-chat-input]");
    const chatSubmit = panelEl?.querySelector<HTMLButtonElement>("[data-sa-chat-submit]");

    statusSelect?.addEventListener("change", async () => {
      try {
        await updateTicketStatus(ticket.id, statusSelect.value as TicketStatus);
        setControlsMessage("Статус обновлён.");
        await refreshList();
      } catch (error) {
        setControlsMessage("Не удалось обновить статус.");
        console.error("[support-admin] update status failed", error);
      }
    });

    assignButton?.addEventListener("click", async () => {
      const agentId = (agentInput?.value ?? "").trim() || user.id;
      try {
        await assignTicket(ticket.id, agentId);
        setControlsMessage("Агент назначен.");
        await refreshList();
      } catch (error) {
        setControlsMessage("Не удалось назначить агента.");
        console.error("[support-admin] assign failed", error);
      }
    });

    escalateButton?.addEventListener("click", async () => {
      try {
        await escalateTicket(ticket.id);
        setControlsMessage("Тикет эскалирован в L2.");
        await refreshList();
      } catch (error) {
        setControlsMessage("Не удалось эскалировать тикет.");
        console.error("[support-admin] escalate failed", error);
      }
    });

    chatForm?.addEventListener("submit", async (event: Event) => {
      event.preventDefault();
      const text = (chatInput?.value ?? "").trim();
      if (!text || !chatInput || !chatSubmit) return;

      chatSubmit.disabled = true;
      setChatStatus("");
      try {
        const message = await sendTicketMessage(ticket.id, { text });
        appendMessage({ ...message, ticketId: message.ticketId || ticket.id });
        chatInput.value = "";
      } catch (error) {
        setChatStatus("Не удалось отправить.");
        console.error("[support-admin] send message failed", error);
      } finally {
        chatSubmit.disabled = false;
      }
    });
  };

  const openTicket = async (ticketId: string): Promise<void> => {
    if (!panelEl || !listEl) return;

    cleanupSocket();
    activeTicketId = ticketId;
    messageIds = new Set<string>();
    listEl.innerHTML = renderTicketList(tickets, activeTicketId);
    panelEl.innerHTML = `<p class="sa-empty">Загрузка тикета…</p>`;

    try {
      const cachedTicket = tickets.find((ticket) => ticket.id === ticketId);
      const ticket = cachedTicket?.description ? cachedTicket : await getTicketById(ticketId);
      tickets = tickets.some((item) => item.id === ticket.id)
        ? tickets.map((item) => (item.id === ticket.id ? ticket : item))
        : [...tickets, ticket];
      panelEl.innerHTML = renderTicketPanel(ticket);
      bindPanelControls(ticket);

      try {
        renderMessages(await getTicketMessages(ticket.id));
      } catch (error) {
        renderMessages([]);
        setChatStatus("История недоступна.");
        console.error("[support-admin] load messages failed", error);
      }

      unsubscribeMessages = subscribeToTicketMessages(ticket.id, {
        onMessage: appendMessage,
        onError: () => setChatStatus(""),
      });
    } catch (error) {
      setPanelMessage("Не удалось открыть тикет.");
      console.error("[support-admin] open ticket failed", error);
    }
  };

  filtersForm?.addEventListener("submit", (event: Event) => {
    event.preventDefault();
    activeTicketId = "";
    cleanupSocket();
    setPanelMessage("Выберите тикет из списка.");
    void refreshList();
  });

  listEl?.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const ticketButton = target.closest<HTMLElement>("[data-sa-ticket-id]");
    const ticketId = ticketButton?.getAttribute("data-sa-ticket-id");
    if (ticketId) {
      void openTicket(ticketId);
    }
  });

  await refreshList();
}
