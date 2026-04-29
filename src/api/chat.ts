import { ApiError } from "./auth";
import { trackedFetch } from "../state/network-status";

type ErrorResponse = {
  error?: string;
};

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

export type GetChatMessagesOptions = {
  after?: string;
  limit?: number;
};

export type ChatMessageSocketHandlers = {
  onMessage: (message: ChatMessage) => void;
  onError?: ((event: Event) => void) | undefined;
  onOpen?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
};

export type ChatMessageSocketSubscription = {
  send: (payload: SendMessagePayload) => boolean;
  isOpen: () => boolean;
  close: () => void;
};

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return text ? (JSON.parse(text) as T) : ([] as T);
  } catch {
    return { error: text || "invalid server response" } as T;
  }
}

function createApiError(
  fallbackMessage: string,
  status: number,
  data: ErrorResponse | unknown,
): ApiError {
  const message =
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as ErrorResponse).error === "string"
      ? (data as ErrorResponse).error!
      : fallbackMessage;

  return new ApiError(message, status, data);
}

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

export async function getChats(): Promise<ChatSummary[]> {
  const response = await trackedFetch("/api/chats", {
    method: "GET",
    credentials: "include",
  });

  const data = await parseJson<RawChat[] | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError("failed to load chats", response.status, data);
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapChat).filter((chat) => Boolean(chat.id));
}

export async function createPrivateChat(otherUserId: string): Promise<ChatSummary> {
  const response = await trackedFetch(`/api/chats?otherUserId=${encodeURIComponent(otherUserId)}`, {
    method: "POST",
    credentials: "include",
  });

  const data = await parseJson<RawChat | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError("failed to create chat", response.status, data);
  }

  return mapChat(data as RawChat);
}

export async function getChatMessages(
  chatId: string,
  options: GetChatMessagesOptions = {},
): Promise<ChatMessage[]> {
  const url = new URL(`/api/chats/${encodeURIComponent(chatId)}/messages`, window.location.origin);

  if (options.after) {
    url.searchParams.set("after", options.after);
  }

  if (typeof options.limit === "number") {
    url.searchParams.set("limit", String(options.limit));
  }

  const response = await trackedFetch(`${url.pathname}${url.search}`, {
    method: "GET",
    credentials: "include",
  });

  const data = await parseJson<RawMessage[] | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError("failed to load messages", response.status, data);
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapMessage).filter((message) => Boolean(message.id));
}

export async function sendChatMessage(
  chatId: string,
  payload: SendMessagePayload,
): Promise<ChatMessage> {
  const response = await trackedFetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await parseJson<RawMessage | ErrorResponse>(response);

  if (!response.ok) {
    throw createApiError("failed to send message", response.status, data);
  }

  return mapMessage(data as RawMessage);
}

function getChatSocketUrl(chatId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  return `${protocol}//${window.location.host}/ws/${encodeURIComponent(chatId)}`;
}

export function subscribeToChatMessages(
  chatId: string,
  handlers: ChatMessageSocketHandlers,
): ChatMessageSocketSubscription {
  const socket = new WebSocket(getChatSocketUrl(chatId));

  socket.addEventListener("open", () => {
    handlers.onOpen?.();
  });

  socket.addEventListener("message", (event: MessageEvent<string>) => {
    try {
      const rawMessage = JSON.parse(event.data) as RawMessage;
      const message = mapMessage(rawMessage);

      if (message.id) {
        handlers.onMessage(message);
      }
    } catch (error) {
      console.error("[chats] failed to parse websocket message", error);
    }
  });

  if (handlers.onError) {
    socket.addEventListener("error", handlers.onError);
  }

  socket.addEventListener("close", () => {
    handlers.onClose?.();
  });

  return {
    send: (payload: SendMessagePayload): boolean => {
      if (socket.readyState !== WebSocket.OPEN) {
        return false;
      }

      socket.send(JSON.stringify(payload));
      return true;
    },
    isOpen: (): boolean => socket.readyState === WebSocket.OPEN,
    close: (): void => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    },
  };
}
