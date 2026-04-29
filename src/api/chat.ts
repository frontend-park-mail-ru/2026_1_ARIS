import { ApiError, apiRequest } from "./core/client";
import { getSessionUser } from "../state/session";
// Повторно экспортируем ApiError для кода, который импортирует его из этого модуля.
export { ApiError };

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

export type ChatSummary = {
  id: string;
  title: string;
  avatarLink?: string | undefined;
  updatedAt?: string | undefined;
  createdAt?: string | undefined;
};

export type ChatMessage = {
  id: string;
  text: string;
  authorName?: string | undefined;
  authorId: string;
  createdAt?: string | undefined;
};

export type SendMessagePayload = {
  text: string;
};

export type ChatMessageSocketHandlers = {
  onMessage: (message: ChatMessage) => void;
  onError?: ((event: Event) => void) | undefined;
};

type ResolvePrivateChatOptions = {
  expectedTitle?: string;
  retries?: number;
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

export async function getChats(signal?: AbortSignal): Promise<ChatSummary[]> {
  const data = await apiRequest<RawChat[]>("/api/chats", { ...(signal ? { signal } : {}) }, []);

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapChat).filter((chat) => Boolean(chat.id));
}

export async function createPrivateChat(otherUserId: string): Promise<ChatSummary> {
  const data = await apiRequest<RawChat>(
    `/api/chats?otherUserId=${encodeURIComponent(otherUserId)}`,
    { method: "POST" },
    {},
  );

  return mapChat(data);
}

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
