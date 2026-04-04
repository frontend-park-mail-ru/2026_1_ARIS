import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import {
  getChatMessages,
  getChats,
  sendChatMessage,
  subscribeToChatMessages,
  type ChatMessage,
  type ChatSummary,
} from "../../api/chat";
import { getSessionUser } from "../../state/session";
import { PROFILE_RECORDS, findProfileRecord } from "../profile/profile-data";
import { renderFeed } from "../feed/feed";

type ChatRoot = (Document | HTMLElement) & {
  __chatsBound?: boolean;
};

type ChatViewMessage = {
  id: string;
  text: string;
  authorName: string;
  isOwn: boolean;
  createdAt?: string | undefined;
  avatarLink?: string | undefined;
};

type ChatViewThread = {
  id: string;
  title: string;
  avatarLink?: string | undefined;
  preview: string;
  previewIsOwn?: boolean | undefined;
  timeLabel: string;
  source: "api" | "mock";
  messages?: ChatViewMessage[] | undefined;
};

function sortMessagesByCreatedAt(messages: ChatViewMessage[]): ChatViewMessage[] {
  return [...messages].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;

    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
      return 0;
    }

    return leftTime - rightTime;
  });
}

type ChatsState = {
  loaded: boolean;
  loadingMessages: boolean;
  source: "api" | "mock";
  query: string;
  threads: ChatViewThread[];
  selectedChatId: string;
  errorMessage: string;
  loadedForUserId: string;
  unsubscribeByChatId: Map<string, () => void>;
};

const chatsState: ChatsState = {
  loaded: false,
  loadingMessages: false,
  source: "mock",
  query: "",
  threads: [],
  selectedChatId: "",
  errorMessage: "",
  loadedForUserId: "",
  unsubscribeByChatId: new Map(),
};

let chatsRoot: ParentNode = document;

function resetChatsState(): void {
  chatsState.unsubscribeByChatId.forEach((unsubscribe) => unsubscribe());
  chatsState.unsubscribeByChatId.clear();
  chatsState.loaded = false;
  chatsState.loadingMessages = false;
  chatsState.source = "mock";
  chatsState.query = "";
  chatsState.threads = [];
  chatsState.selectedChatId = "";
  chatsState.errorMessage = "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAvatarSrc(avatarLink?: string): string {
  return avatarLink
    ? `/image-proxy?url=${encodeURIComponent(avatarLink)}`
    : "/assets/img/default-avatar.png";
}

function getCurrentUserFullName(): string {
  const currentUser = getSessionUser();
  return `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim();
}

function isOwnMessage(authorId?: string, authorName?: string): boolean {
  const currentUser = getSessionUser();
  const currentUserId = String(currentUser?.id ?? "");
  const currentUserName = getCurrentUserFullName();

  if (authorId && currentUserId && String(authorId) === currentUserId) {
    return true;
  }

  if (authorName && currentUserName && authorName.trim() === currentUserName) {
    return true;
  }

  return false;
}

function formatChatTime(value?: string): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatMessageTime(value?: string): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function createMockThreads(): ChatViewThread[] {
  const byId = (id: string) => PROFILE_RECORDS.find((profile) => profile.id === id);
  const currentUser = getSessionUser();
  const currentUserName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Вы";

  const pavel = byId("pavel-babkin");
  const arina = byId("arina-askhabova");
  const milana = byId("milana-shakhbieva");
  const egor = byId("egor-larkin");
  const sofya = byId("sofya-sitnichenko");

  return [
    {
      id: "mock-pavel",
      title: pavel ? `${pavel.firstName} ${pavel.lastName}` : "Павел Бабкин",
      avatarLink: pavel?.avatarLink,
      preview: "у вас неплохой диплом",
      timeLabel: "22 фев. 23:45",
      source: "mock",
      messages: [
        {
          id: "m1",
          authorName: pavel ? `${pavel.firstName} ${pavel.lastName}` : "Павел Бабкин",
          text: "у вас неплохой диплом",
          createdAt: "2026-02-22T12:50:00+03:00",
          isOwn: false,
          avatarLink: pavel?.avatarLink,
        },
        {
          id: "m2",
          authorName: currentUserName,
          text: "Здравствуйте, Павел Сергеевич. Увидел вашу машину на парковке, понял, что вы сегодня в университете. Как вам в целом мой диплом? Я дополнил одно его дело, хорошо поработал над конструкторской частью. Посмотрите, отпишитесь если есть замечания. Буду рад любой критике. P.S. передавайте привет Кате",
          createdAt: "2026-02-22T23:45:00+03:00",
          isOwn: true,
        },
        {
          id: "m3",
          authorName: pavel ? `${pavel.firstName} ${pavel.lastName}` : "Павел Бабкин",
          text: "у вас неплохой диплом",
          createdAt: "2026-02-22T12:50:00+03:00",
          isOwn: false,
          avatarLink: pavel?.avatarLink,
        },
      ],
    },
    {
      id: "mock-arina",
      title: arina ? `${arina.firstName} ${arina.lastName}` : "Арина Асхабова",
      avatarLink: arina?.avatarLink,
      preview: "ого!!!!!!!!!!",
      timeLabel: "1 ч.",
      source: "mock",
      messages: [
        {
          id: "m4",
          authorName: arina ? `${arina.firstName} ${arina.lastName}` : "Арина Асхабова",
          text: "ого!!!!!!!!!!",
          createdAt: "2026-03-30T17:20:00+03:00",
          isOwn: false,
          avatarLink: arina?.avatarLink,
        },
      ],
    },
    {
      id: "mock-milana",
      title: milana ? `${milana.firstName} ${milana.lastName}` : "Милана Шахбиева",
      avatarLink: milana?.avatarLink,
      preview: "пойдем в мафию",
      timeLabel: "1 ч.",
      source: "mock",
      messages: [
        {
          id: "m5",
          authorName: milana ? `${milana.firstName} ${milana.lastName}` : "Милана Шахбиева",
          text: "пойдем в мафию",
          createdAt: "2026-03-30T17:05:00+03:00",
          isOwn: false,
          avatarLink: milana?.avatarLink,
        },
      ],
    },
    {
      id: "mock-egor",
      title: egor ? `${egor.firstName} ${egor.lastName}` : "Егор Ларкин",
      avatarLink: egor?.avatarLink,
      preview: "люблю ее сильно",
      timeLabel: "1 ч.",
      source: "mock",
      messages: [
        {
          id: "m6",
          authorName: egor ? `${egor.firstName} ${egor.lastName}` : "Егор Ларкин",
          text: "люблю ее сильно",
          createdAt: "2026-03-30T16:45:00+03:00",
          isOwn: false,
          avatarLink: egor?.avatarLink,
        },
      ],
    },
    {
      id: "mock-sofya",
      title: sofya ? `${sofya.firstName} ${sofya.lastName}` : "Софья Ситниченко",
      avatarLink: sofya?.avatarLink,
      preview: "ваши сообщения в 12...",
      timeLabel: "1 ч.",
      source: "mock",
      messages: [
        {
          id: "m7",
          authorName: sofya ? `${sofya.firstName} ${sofya.lastName}` : "Софья Ситниченко",
          text: "ваши сообщения в 12...",
          createdAt: "2026-03-30T16:15:00+03:00",
          isOwn: false,
          avatarLink: sofya?.avatarLink,
        },
      ],
    },
  ];
}

function mapApiChatsToThreads(chats: ChatSummary[]): ChatViewThread[] {
  return [...chats]
    .sort((left, right) => {
      const leftTime = new Date(left.updatedAt ?? left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.updatedAt ?? right.createdAt ?? 0).getTime();

      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
        return 0;
      }

      return rightTime - leftTime;
    })
    .map((chat, index) => {
      const matchedProfile = findProfileRecord({
        id: chat.title,
        firstName: chat.title.split(" ")[0] ?? "",
        lastName: chat.title.split(" ").slice(1).join(" "),
      });

      return {
        id: chat.id,
        title: chat.title || `Чат ${index + 1}`,
        avatarLink: chat.avatarLink ?? matchedProfile?.avatarLink,
        preview: "",
        previewIsOwn: false,
        timeLabel: formatChatTime(chat.updatedAt ?? chat.createdAt),
        source: "api",
      };
    });
}

function mapMessageToViewMessage(message: ChatMessage, thread: ChatViewThread): ChatViewMessage {
  const currentUser = getSessionUser();
  const own = isOwnMessage(message.authorId, message.authorName);

  return {
    id: message.id,
    text: message.text,
    authorName:
      message.authorName ??
      (own
        ? `${currentUser?.firstName ?? "Вы"} ${currentUser?.lastName ?? ""}`.trim()
        : thread.title),
    isOwn: own,
    createdAt: message.createdAt,
    avatarLink: own ? currentUser?.avatarLink : thread.avatarLink,
  };
}

function dedupeMessagesById(messages: ChatViewMessage[]): ChatViewMessage[] {
  const byId = new Map<string, ChatViewMessage>();

  messages.forEach((message) => {
    byId.set(message.id, message);
  });

  return Array.from(byId.values());
}

function updateThreadPreview(thread: ChatViewThread): void {
  const messages = thread.messages ?? [];
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return;
  }

  thread.preview = lastMessage.text;
  thread.previewIsOwn = lastMessage.isOwn;
  thread.timeLabel = formatMessageTime(lastMessage.createdAt);
}

function appendIncomingMessage(chatId: string, message: ChatMessage): void {
  const thread = chatsState.threads.find((item) => item.id === chatId);
  if (!thread || thread.source !== "api") {
    return;
  }

  const incomingMessage = mapMessageToViewMessage(message, thread);
  const currentMessages = thread.messages ?? [];
  if (currentMessages.some((item) => item.id === incomingMessage.id)) {
    return;
  }

  thread.messages = sortMessagesByCreatedAt(
    dedupeMessagesById([...currentMessages, incomingMessage]),
  );
  updateThreadPreview(thread);
  refreshChatsPage(chatsRoot);
}

function ensureChatSocketSubscribed(chatId: string): void {
  if (chatsState.source !== "api" || chatsState.unsubscribeByChatId.has(chatId)) {
    return;
  }

  const unsubscribe = subscribeToChatMessages(chatId, {
    onMessage: (message) => appendIncomingMessage(chatId, message),
    onError: () => {
      console.info("[chats] source=ws scope=messages error", { chatId });
    },
  });

  chatsState.unsubscribeByChatId.set(chatId, unsubscribe);
  console.info("[chats] source=ws scope=messages connected", { chatId });
}

function getRequestedChatId(): string {
  return new URLSearchParams(window.location.search).get("chatId") ?? "";
}

async function ensureMessagesLoaded(
  chatId: string,
  options: { background?: boolean } = {},
): Promise<void> {
  const thread = chatsState.threads.find((item) => item.id === chatId);
  if (!thread || thread.messages || thread.source !== "api") {
    return;
  }

  if (!options.background) {
    chatsState.loadingMessages = true;
  }

  try {
    const messages = await getChatMessages(chatId);

    thread.messages = sortMessagesByCreatedAt(
      dedupeMessagesById(messages.map((message) => mapMessageToViewMessage(message, thread))),
    );

    updateThreadPreview(thread);

    console.info("[chats] source=api scope=messages", {
      chatId,
      count: thread.messages.length,
    });

    if (!options.background) {
      chatsState.errorMessage = "";
    }
  } catch (error) {
    thread.messages = [];
    if (!options.background) {
      chatsState.errorMessage =
        error instanceof Error ? error.message : "Не получилось загрузить сообщения.";
    }

    console.info("[chats] source=api scope=messages error", {
      chatId,
      error: error instanceof Error ? error.message : "Не получилось загрузить сообщения.",
    });
  } finally {
    if (!options.background) {
      chatsState.loadingMessages = false;
    }
  }
}

async function ensureChatsLoaded(): Promise<void> {
  if (chatsState.loaded) {
    if (chatsState.selectedChatId) {
      await ensureMessagesLoaded(chatsState.selectedChatId);
    }

    return;
  }

  try {
    const chats = await getChats();
    const requestedChatId = getRequestedChatId();
    chatsState.source = "api";
    chatsState.threads = mapApiChatsToThreads(chats);
    chatsState.selectedChatId =
      chatsState.threads.find((thread) => thread.id === requestedChatId)?.id ??
      chatsState.threads[0]?.id ??
      "";
    chatsState.errorMessage = "";

    console.info("[chats] source=api scope=list", {
      count: chatsState.threads.length,
      selectedChatId: chatsState.selectedChatId,
    });
  } catch {
    const requestedChatId = getRequestedChatId();
    chatsState.source = "mock";
    chatsState.threads = createMockThreads();
    chatsState.selectedChatId =
      chatsState.threads.find((thread) => thread.id === requestedChatId)?.id ??
      chatsState.threads[0]?.id ??
      "";
    chatsState.errorMessage = "";

    console.info("[chats] source=fallback scope=list", {
      count: chatsState.threads.length,
      selectedChatId: chatsState.selectedChatId,
    });
  }

  chatsState.loaded = true;

  await Promise.all(
    chatsState.threads.map(async (thread) => {
      ensureChatSocketSubscribed(thread.id);
      await ensureMessagesLoaded(thread.id, { background: true });
    }),
  );

  if (chatsState.selectedChatId) {
    await ensureMessagesLoaded(chatsState.selectedChatId);
  }
}

function getFilteredThreads(): ChatViewThread[] {
  return chatsState.threads;
}

function getThreadPreviewState(thread: ChatViewThread): {
  text: string;
  isOwn: boolean;
  timeLabel: string;
} {
  const messages = thread.messages ?? [];
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return {
      text: thread.preview,
      isOwn: Boolean(thread.previewIsOwn),
      timeLabel: thread.preview.trim() ? thread.timeLabel : "",
    };
  }

  return {
    text: lastMessage.text,
    isOwn: lastMessage.isOwn,
    timeLabel: formatMessageTime(lastMessage.createdAt) || thread.timeLabel,
  };
}

function getSelectedThread(filteredThreads: ChatViewThread[]): ChatViewThread | undefined {
  return (
    filteredThreads.find((thread) => thread.id === chatsState.selectedChatId) ?? filteredThreads[0]
  );
}

function renderThreadsList(threads: ChatViewThread[]): string {
  if (!threads.length) {
    return '<p class="chats-list__empty">Чатов пока нет.</p>';
  }

  return threads
    .map((thread) => {
      const isActive = thread.id === chatsState.selectedChatId;
      const previewState = getThreadPreviewState(thread);

      return `
        <button
          type="button"
          class="chat-thread${isActive ? " chat-thread--active" : ""}"
          data-chat-select="${escapeHtml(thread.id)}"
        >
          <img
            class="chat-thread__avatar"
            src="${getAvatarSrc(thread.avatarLink)}"
            alt="${escapeHtml(thread.title)}"
          >
          <div class="chat-thread__content">
            <strong class="chat-thread__title">${escapeHtml(thread.title)}</strong>
            <div class="chat-thread__meta">
              <span class="chat-thread__preview">
                ${previewState.isOwn ? '<span class="chat-thread__preview-prefix">Вы:</span> ' : ""}
                ${escapeHtml(previewState.text)}
              </span>
              <span class="chat-thread__time">${escapeHtml(previewState.timeLabel)}</span>
            </div>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderMessages(thread?: ChatViewThread): string {
  if (!thread) {
    return '<div class="chat-view__empty">Выбери чат слева, чтобы открыть переписку.</div>';
  }

  if (chatsState.loadingMessages && thread.source === "api" && !thread.messages) {
    return '<div class="chat-view__loading">Загружаем сообщения...</div>';
  }

  const messages = thread.messages ?? [];

  if (!messages.length) {
    return '<div class="chat-view__empty">Сообщений пока нет.</div>';
  }

  return messages
    .map((message) => {
      return `
        <article class="chat-bubble${message.isOwn ? " chat-bubble--own" : ""}">
          <img
            class="chat-bubble__avatar"
            src="${getAvatarSrc(message.avatarLink)}"
            alt="${escapeHtml(message.authorName)}"
          >
          <div class="chat-bubble__body">
            <h3 class="chat-bubble__author">${escapeHtml(message.authorName)}</h3>
            <p class="chat-bubble__text">${escapeHtml(message.text)}</p>
          </div>
          <span class="chat-bubble__time">${escapeHtml(formatMessageTime(message.createdAt))}</span>
        </article>
      `;
    })
    .join("");
}

function renderChatsContent(): string {
  const filteredThreads = getFilteredThreads();
  const selectedThread = getSelectedThread(filteredThreads);

  if (selectedThread && selectedThread.id !== chatsState.selectedChatId) {
    chatsState.selectedChatId = selectedThread.id;
  }

  return `
    <section class="chats-page" data-chats-page>
      <aside class="chats-sidebar">
        <h1 class="chats-sidebar__title">Сообщения</h1>

        <label class="chats-search" aria-label="Поиск по чатам">
          <img class="chats-search__icon" src="/assets/img/icons/search.svg" alt="">
          <input
            class="chats-search__input"
            type="text"
            value=""
            placeholder="Поиск по чатам"
            readonly
            aria-disabled="true"
            tabindex="-1"
            data-chat-search
          >
        </label>

        <div class="chats-list">
          ${renderThreadsList(filteredThreads)}
        </div>
      </aside>

      <section class="chat-view">
        ${
          selectedThread
            ? `
              <header class="chat-header">
                <img
                  class="chat-header__avatar"
                  src="${getAvatarSrc(selectedThread.avatarLink)}"
                  alt="${escapeHtml(selectedThread.title)}"
                >
                <div>
                  <h2 class="chat-header__title">${escapeHtml(selectedThread.title)}</h2>
                  ${
                    chatsState.source === "mock"
                      ? '<p class="chat-header__meta">Демо-интерфейс до полного подключения API.</p>'
                      : ""
                  }
                </div>
              </header>
            `
            : ""
        }

        <div class="chat-messages">
          ${renderMessages(selectedThread)}
        </div>

        ${
          selectedThread
            ? `
              <form class="chat-compose" data-chat-compose-form>
                <input
                  class="chat-compose__field"
                  type="text"
                  name="message"
                  placeholder="Начните печатать сообщение..."
                  autocomplete="off"
                >
                <button type="submit" class="chat-compose__send">Отправить</button>
              </form>
            `
            : ""
        }
      </section>
    </section>
  `;
}

function refreshChatsPage(root: ParentNode = document): void {
  const container = root.querySelector("[data-chats-page]");
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const template = document.createElement("template");
  template.innerHTML = renderChatsContent().trim();

  const next = template.content.firstElementChild;
  if (!(next instanceof HTMLElement)) {
    return;
  }

  container.replaceWith(next);
}

export async function renderChats(): Promise<string> {
  const isAuthorised = getSessionUser() !== null;
  const currentUserId = String(getSessionUser()?.id ?? "");

  if (chatsState.loadedForUserId !== currentUserId) {
    resetChatsState();
    chatsState.loadedForUserId = currentUserId;
  }

  if (!isAuthorised) {
    return renderFeed();
  }

  await ensureChatsLoaded();

  return `
    <div class="app-page">
      ${renderHeader()}

      <main class="app-layout app-layout--content-wide">
        <aside class="app-layout__left">
          ${renderSidebar({ isAuthorised })}
        </aside>

        <section class="app-layout__center">
          ${renderChatsContent()}
        </section>
      </main>
    </div>
  `;
}

export function initChats(root: Document | HTMLElement = document): void {
  const bindableRoot = root as ChatRoot;
  chatsRoot = root;

  if (bindableRoot.__chatsBound) {
    return;
  }

  root.addEventListener("click", async (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const chatButton = target.closest("[data-chat-select]");
    if (!(chatButton instanceof HTMLButtonElement)) {
      return;
    }

    const chatId = chatButton.getAttribute("data-chat-select");
    if (!chatId || chatId === chatsState.selectedChatId) {
      return;
    }

    chatsState.selectedChatId = chatId;
    refreshChatsPage(root);
    await ensureMessagesLoaded(chatId);
    refreshChatsPage(root);
  });

  root.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) {
      return;
    }

    if (!target.matches("[data-chat-compose-form]")) {
      return;
    }

    event.preventDefault();

    const selectedThread = chatsState.threads.find(
      (thread) => thread.id === chatsState.selectedChatId,
    );
    if (!selectedThread) {
      return;
    }

    const formData = new FormData(target);
    const text = String(formData.get("message") ?? "").trim();
    if (!text) {
      return;
    }

    const currentUser = getSessionUser();
    const optimisticMessage: ChatViewMessage = {
      id: `local-${Date.now()}`,
      text,
      authorName: `${currentUser?.firstName ?? "Вы"} ${currentUser?.lastName ?? ""}`.trim(),
      isOwn: true,
      createdAt: new Date().toISOString(),
      avatarLink: currentUser?.avatarLink,
    };

    if (!selectedThread.messages) {
      selectedThread.messages = [];
    }

    selectedThread.messages = sortMessagesByCreatedAt([
      ...selectedThread.messages,
      optimisticMessage,
    ]);
    selectedThread.preview = text;
    selectedThread.previewIsOwn = true;
    selectedThread.timeLabel = formatMessageTime(optimisticMessage.createdAt);
    target.reset();
    refreshChatsPage(root);

    if (selectedThread.source === "api") {
      void sendChatMessage(selectedThread.id, { text })
        .then((message) => {
          console.info("[chats] source=api scope=send", {
            chatId: selectedThread.id,
            messageId: message.id,
          });

          selectedThread.messages = sortMessagesByCreatedAt(
            dedupeMessagesById(
              (selectedThread.messages ?? []).map((item) =>
                item.id === optimisticMessage.id
                  ? {
                      ...item,
                      id: message.id,
                      createdAt: message.createdAt,
                    }
                  : item,
              ),
            ),
          );
          updateThreadPreview(selectedThread);
          refreshChatsPage(root);
        })
        .catch((error: unknown) => {
          console.error("[chats] source=api scope=send error", error);
          selectedThread.messages = (selectedThread.messages ?? []).filter(
            (item) => item.id !== optimisticMessage.id,
          );
          refreshChatsPage(root);
        });
    }
  });

  bindableRoot.__chatsBound = true;
}
