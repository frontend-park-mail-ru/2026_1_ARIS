/**
 * API для работы с личными чатами.
 *
 * Содержит:
 * - загрузку списка диалогов;
 * - создание или поиск приватного чата;
 * - загрузку и отправку сообщений;
 * - подписку на сообщения по WebSocket.
 *
 * Использует REST- и WebSocket-эндпоинты `/api/chats` и `/ws/:chatId`.
 */
import { ApiError, apiRequest } from "./core/client";
import { getSessionUser } from "../state/session";
// Повторно экспортируем `ApiError`, чтобы сохранить текущие импорты в других модулях.
export { ApiError };

/**
 * Сырой чат из API.
 *
 * Поддерживает несколько вариантов имён полей, потому что разные ручки
 * backend возвращают немного разную форму ответа.
 */
type RawChat = {
  id?: number | string;
  ID?: number | string;
  uid?: string;
  Uid?: string;
  title?: string;
  Title?: string;
  avatarLink?: string;
  avatar_id?: number | null;
  AvatarID?: number | null;
  updatedAt?: string;
  UpdatedAt?: string;
  createdAt?: string;
  CreatedAt?: string;
};

/**
 * Сырой ответ API по сообщению чата.
 */
type RawMessage = {
  id?: number | string;
  ID?: number | string;
  text?: string | null;
  Text?: string | null;
  authorName?: string;
  AuthorName?: string;
  authorId?: number | string;
  AuthorID?: number | string;
  createdAt?: string;
  CreatedAt?: string;
};

/**
 * Краткая карточка диалога в списке чатов.
 */
export type ChatSummary = {
  /** Уникальный идентификатор чата. */
  id: string;
  /** Заголовок диалога в списке и в шапке чата. */
  title: string;
  /** Ссылка на аватар собеседника, если она пришла с сервера. */
  avatarLink?: string | undefined;
  /** Дата последнего обновления чата в формате ISO. */
  updatedAt?: string | undefined;
  /** Дата создания чата в формате ISO. */
  createdAt?: string | undefined;
};

/**
 * Сообщение в нормализованном клиентском формате.
 */
export type ChatMessage = {
  /** Уникальный идентификатор сообщения. */
  id: string;
  /** Текст сообщения без дополнительной разметки. */
  text: string;
  /** Отображаемое имя автора сообщения. */
  authorName?: string | undefined;
  /** Идентификатор автора в строковом виде. */
  authorId: string;
  /** Дата создания сообщения в формате ISO. */
  createdAt?: string | undefined;
};

/**
 * Тело запроса на отправку сообщения.
 */
export type SendMessagePayload = {
  /** Текст сообщения, который нужно отправить в чат. */
  text: string;
};

/**
 * Обработчики событий WebSocket-подписки на сообщения чата.
 */
export type ChatMessageSocketHandlers = {
  /** Вызывается при получении нового сообщения. */
  onMessage: (message: ChatMessage) => void;
  /** Вызывается при ошибке сокета, если обработчик передан. */
  onError?: ((event: Event) => void) | undefined;
};

/**
 * Параметры поиска или создания приватного чата.
 */
type ResolvePrivateChatOptions = {
  /** Ожидаемый заголовок чата для дополнительной проверки после создания. */
  expectedTitle?: string;
  /** Количество повторных проверок списка чатов после создания. */
  retries?: number;
  /** Задержка между повторными проверками в миллисекундах. */
  retryDelayMs?: number;
};

function mapChat(raw: RawChat): ChatSummary {
  return {
    id: String(raw.id ?? raw.ID ?? raw.uid ?? raw.Uid ?? ""),
    title: String(raw.title ?? raw.Title ?? "Чат"),
    avatarLink: raw.avatarLink,
    updatedAt: raw.updatedAt ?? raw.UpdatedAt,
    createdAt: raw.createdAt ?? raw.CreatedAt,
  };
}

function mapMessage(raw: RawMessage): ChatMessage {
  return {
    id: String(raw.id ?? raw.ID ?? ""),
    text: String(raw.text ?? raw.Text ?? ""),
    authorName:
      typeof (raw.authorName ?? raw.AuthorName) === "string"
        ? String(raw.authorName ?? raw.AuthorName)
        : undefined,
    authorId: String(raw.authorId ?? raw.AuthorID ?? ""),
    createdAt: raw.createdAt ?? raw.CreatedAt,
  };
}

function normaliseChatTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Загружает список чатов текущего пользователя.
 *
 * Нормализует форму ответа и отбрасывает записи без идентификатора,
 * чтобы UI работал с предсказуемыми данными.
 *
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<ChatSummary[]>} Нормализованный список диалогов.
 * @example
 * const chats = await getChats();
 * const firstChatTitle = chats[0]?.title;
 */
export async function getChats(signal?: AbortSignal): Promise<ChatSummary[]> {
  const data = await apiRequest<RawChat[]>("/api/chats", { ...(signal ? { signal } : {}) }, []);

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapChat).filter((chat) => Boolean(chat.id));
}

/**
 * Создаёт приватный чат с указанным пользователем.
 *
 * Используется как точка входа в переписку, когда пользователь нажимает
 * кнопку «Сообщение» на профиле или в списке друзей.
 *
 * @param {string} otherUserId Идентификатор собеседника.
 * @returns {Promise<ChatSummary>} Созданный или уже существующий чат.
 * @example
 * const chat = await createPrivateChat("7");
 * console.log(chat.id);
 */
export async function createPrivateChat(otherUserId: string): Promise<ChatSummary> {
  const data = await apiRequest<RawChat>(
    `/api/chats?otherUserId=${encodeURIComponent(otherUserId)}`,
    { method: "POST" },
    {},
  );

  return mapChat(data);
}

/**
 * Возвращает идентификатор приватного чата с собеседником.
 *
 * Сначала пробует создать или переиспользовать чат через API,
 * а затем при необходимости перепроверяет список диалогов.
 * Это нужно потому, что backend не всегда сразу возвращает
 * полностью согласованные данные по только что созданному чату.
 *
 * @param {string} otherUserId Идентификатор собеседника.
 * @param {ResolvePrivateChatOptions} [options={}] Параметры повторной проверки.
 * @returns {Promise<string>} Идентификатор найденного или созданного диалога.
 * @example
 * const chatId = await createOrResolvePrivateChatId("7", {
 *   expectedTitle: "Константин Галанин",
 * });
 */
export async function createOrResolvePrivateChatId(
  otherUserId: string,
  options: ResolvePrivateChatOptions = {},
): Promise<string> {
  const expectedTitle = normaliseChatTitle(options.expectedTitle ?? "");
  const retries = options.retries ?? 5;
  const retryDelayMs = options.retryDelayMs ?? 250;

  const createdChat = await createPrivateChat(otherUserId);
  const createdChatTitle = normaliseChatTitle(createdChat.title);
  const isCreatedChatExpected =
    Boolean(createdChat.id) && (!expectedTitle || createdChatTitle === expectedTitle);

  if (isCreatedChatExpected) {
    return createdChat.id;
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const chats = await getChats();
    const matchedChat = chats.find((chat) => {
      if (createdChat.id && chat.id === createdChat.id) {
        return true;
      }

      return expectedTitle ? normaliseChatTitle(chat.title) === expectedTitle : false;
    });

    if (matchedChat?.id) {
      return matchedChat.id;
    }

    if (attempt < retries) {
      await sleep(retryDelayMs);
    }
  }

  throw new Error("Не удалось определить созданный чат.");
}

/**
 * Загружает сообщения выбранного чата.
 *
 * Возвращает только нормализованные записи с непустым идентификатором,
 * чтобы логика рендера и дедупликации работала стабильно.
 *
 * @param {string} chatId Идентификатор чата.
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<ChatMessage[]>} Список сообщений в клиентском формате.
 * @example
 * const messages = await getChatMessages("5");
 * const latestText = messages.at(-1)?.text;
 */
export async function getChatMessages(
  chatId: string,
  signal?: AbortSignal,
): Promise<ChatMessage[]> {
  const data = await apiRequest<RawMessage[]>(
    `/api/chats/${encodeURIComponent(chatId)}/messages`,
    { ...(signal ? { signal } : {}) },
    [],
  );

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapMessage).filter((message) => Boolean(message.id));
}

/**
 * Отправляет сообщение в указанный чат.
 *
 * Используется после optimistic update, когда UI уже показал сообщение локально
 * и теперь должен получить подтверждение от сервера.
 *
 * @param {string} chatId Идентификатор чата.
 * @param {SendMessagePayload} payload Данные сообщения.
 * @returns {Promise<ChatMessage>} Сообщение после подтверждения сервером.
 * @example
 * await sendChatMessage("5", { text: "Привет!" });
 */
export async function sendChatMessage(
  chatId: string,
  payload: SendMessagePayload,
): Promise<ChatMessage> {
  const data = await apiRequest<RawMessage>(
    `/api/chats/${encodeURIComponent(chatId)}/messages`,
    { method: "POST", body: payload },
    {},
  );

  return mapMessage(data);
}

function getChatSocketUrl(chatId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/${encodeURIComponent(chatId)}`;
}

/**
 * Подписывает чат на входящие сообщения по WebSocket.
 *
 * Автоматически переподключается после обрыва, чтобы пользователь
 * не терял обновления при временных сетевых сбоях.
 *
 * @param {string} chatId Идентификатор чата.
 * @param {ChatMessageSocketHandlers} handlers Обработчики событий сокета.
 * @returns {() => void} Функция отписки и закрытия соединения.
 * @example
 * const unsubscribe = subscribeToChatMessages("5", {
 *   onMessage: (message) => console.log(message.text),
 * });
 * unsubscribe();
 */
export function subscribeToChatMessages(
  chatId: string,
  handlers: ChatMessageSocketHandlers,
): () => void {
  const user = getSessionUser();

  if (!user) {
    return () => {};
  }

  let socket: WebSocket;
  let retries = 0;
  let intentionalClose = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect(): void {
    if (intentionalClose) return;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    socket = new WebSocket(getChatSocketUrl(chatId));

    socket.addEventListener("message", (event: MessageEvent<string>) => {
      try {
        const rawMessage = JSON.parse(event.data) as RawMessage;
        const message = mapMessage(rawMessage);
        if (message.id) handlers.onMessage(message);
      } catch (error) {
        console.error("[chats] failed to parse websocket message", error);
      }
    });

    if (handlers.onError) {
      socket.addEventListener("error", handlers.onError);
    }

    socket.addEventListener("open", () => {
      retries = 0;
    });

    socket.addEventListener("close", () => {
      if (intentionalClose) return;
      const delay = Math.min(1000 * 2 ** retries, 30_000) + Math.random() * 500;
      retries += 1;
      reconnectTimer = setTimeout(connect, delay);
    });
  }

  connect();

  return () => {
    intentionalClose = true;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  };
}
