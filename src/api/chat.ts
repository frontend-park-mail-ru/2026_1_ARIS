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
import type { UploadedMedia } from "./profile";
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
  uid?: string;
  text?: string | null;
  Text?: string | null;
  authorName?: string;
  AuthorName?: string;
  parentMessage?: number | string | null;
  parentMessageId?: number | string | null;
  chat?: number | string;
  authorId?: number | string;
  AuthorID?: number | string;
  sticker?: number | string | null;
  stickerData?: RawSticker | null;
  media?: RawMessageAttachment[];
  files?: RawMessageAttachment[];
  reactions?: RawMessageReaction[];
  myReaction?: string | null;
  isActive?: boolean;
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string;
};

type RawMessageAttachment = {
  id?: number | string;
  uid?: string;
  mimeType?: string;
  url?: string;
  name?: string;
  fileName?: string;
  file_name?: string;
  originalName?: string;
};

type RawMessageReaction = {
  type?: string;
  count?: number | string;
};

type RawStickerPack = {
  id?: number | string;
  uid?: string;
  title?: string;
  authorId?: number | string | null;
  author_id?: number | string | null;
  AuthorID?: number | string | null;
  createdAt?: string;
  updatedAt?: string;
};

type RawSticker = {
  id?: number | string;
  uid?: string;
  packId?: number | string | null;
  mediaId?: number | string | null;
  mimeType?: string | null;
  url?: string | null;
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
  /** UUID сообщения, если сервер его вернул. */
  uid?: string | undefined;
  /** Текст сообщения без дополнительной разметки. */
  text: string;
  /** Отображаемое имя автора сообщения. */
  authorName?: string | undefined;
  /** Сообщение, на которое отвечает текущая запись. */
  parentMessageId?: string | undefined;
  /** Идентификатор чата из ответа сервера. */
  chatId?: string | undefined;
  /** Идентификатор автора в строковом виде. */
  authorId: string;
  /** Идентификатор стикера, если сообщение стикерное. */
  stickerId?: string | undefined;
  /** Данные стикера для отображения. */
  stickerData?: Sticker | undefined;
  /** Фото и видео вложения сообщения. */
  media: MessageAttachment[];
  /** Остальные файловые вложения сообщения. */
  files: MessageAttachment[];
  /** Сводка emoji-реакций. */
  reactions: MessageReaction[];
  /** Реакция текущего пользователя. */
  myReaction?: string | undefined;
  /** Активно ли сообщение. */
  isActive: boolean;
  /** Дата создания сообщения в формате ISO. */
  createdAt?: string | undefined;
  /** Дата обновления сообщения в формате ISO. */
  updatedAt?: string | undefined;
};

export type AttachmentPayload = {
  mediaID: number;
};

export type MessageAttachment = {
  id: string;
  uid: string;
  mimeType: string;
  url: string;
  name?: string;
};

export type StickerPack = {
  id: string;
  uid: string;
  title: string;
  authorId: string | null;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
};

export type Sticker = {
  id: string;
  uid: string;
  packId?: string | undefined;
  mediaId?: string | undefined;
  mimeType?: string | undefined;
  url?: string | undefined;
};

export type MessageReaction = {
  type: string;
  count: number;
};

export type MessageReactionType = "👍" | "❤️" | "😂" | "😢" | "😡";

/**
 * Тело запроса на отправку сообщения.
 */
export type SendMessagePayload = {
  /** Текст сообщения, который нужно отправить в чат. */
  text?: string;
  /** ID сообщения, на которое отвечают. */
  parentMessageId?: number;
  /** ID стикера для отдельного стикерного сообщения. */
  stickerId?: number;
  /** Фото и видео вложения. */
  media?: AttachmentPayload[];
  /** Остальные файловые вложения. */
  files?: AttachmentPayload[];
};

type GetMessagesOptions = {
  limit?: number;
  offset?: number;
  after?: number | string;
  signal?: AbortSignal;
};

type ListOptions = {
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
};

type StickerPackListOptions = ListOptions & {
  search?: string;
  my?: boolean;
};

export type CreateStickerPackPayload = {
  title: string;
};

export type AddStickerToPackPayload = {
  mediaID: number;
  sortOrder?: number;
};

type UploadedMediaPayload =
  | UploadedMedia
  | {
      mediaID?: number | string;
      mediaId?: number | string;
      media_id?: number | string;
      mediaURL?: string;
      mediaUrl?: string;
      media_url?: string;
      url?: string;
    };

type UploadMediaResponse = {
  media?: UploadedMediaPayload[];
  errors?: Array<{ index?: number; error?: string }>;
};

/**
 * Обработчики событий WebSocket-подписки на сообщения чата.
 */
export type ChatMessageSocketHandlers = {
  /** Вызывается при получении нового сообщения. */
  onMessage: (message: ChatMessage) => void;
  /** Вызывается при ошибке сокета, если обработчик передан. */
  onError?: ((event: Event) => void) | undefined;
  /** Вызывается после успешного открытия WebSocket-соединения. */
  onOpen?: (() => void) | undefined;
  /** Вызывается после закрытия WebSocket-соединения. */
  onClose?: (() => void) | undefined;
};

/**
 * Управляющий объект WebSocket-подписки на чат.
 */
export type ChatMessageSocketSubscription = {
  /** Пытается отправить сообщение через уже открытый сокет. */
  send: (payload: SendMessagePayload) => boolean;
  /** Показывает, открыт ли сокет прямо сейчас. */
  isOpen: () => boolean;
  /** Закрывает подписку и останавливает переподключения. */
  close: () => void;
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

function parseNumericCount(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(numeric) ? numeric : 0;
}

function mapAttachment(raw: RawMessageAttachment | null | undefined): MessageAttachment | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const id = String(raw.id ?? "").trim();
  const url = String(raw.url ?? "").trim();
  if (!id || !url) {
    return null;
  }

  const name = (raw.name ?? raw.fileName ?? raw.file_name ?? raw.originalName ?? "").trim();

  return {
    id,
    uid: String(raw.uid ?? ""),
    mimeType: String(raw.mimeType ?? ""),
    url,
    ...(name ? { name } : {}),
  };
}

function mapSticker(raw: RawSticker | null | undefined): Sticker | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const id = String(raw.id ?? "").trim();
  if (!id) {
    return undefined;
  }

  const packId = raw.packId === undefined || raw.packId === null ? "" : String(raw.packId);
  const mediaId = raw.mediaId === undefined || raw.mediaId === null ? "" : String(raw.mediaId);
  const mimeType = raw.mimeType ? String(raw.mimeType) : "";
  const url = raw.url ? String(raw.url) : "";

  return {
    id,
    uid: String(raw.uid ?? ""),
    ...(packId ? { packId } : {}),
    ...(mediaId ? { mediaId } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(url ? { url } : {}),
  };
}

function mapStickerPack(raw: RawStickerPack): StickerPack | null {
  const id = String(raw.id ?? "").trim();
  if (!id) {
    return null;
  }
  const rawAuthorId = raw.authorId ?? raw.author_id ?? raw.AuthorID;

  return {
    id,
    uid: String(raw.uid ?? ""),
    title: String(raw.title ?? ""),
    authorId: rawAuthorId === undefined || rawAuthorId === null ? null : String(rawAuthorId),
    ...(raw.createdAt ? { createdAt: raw.createdAt } : {}),
    ...(raw.updatedAt ? { updatedAt: raw.updatedAt } : {}),
  };
}

function mapUploadedMedia(raw: UploadedMediaPayload | null | undefined): UploadedMedia | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const mediaID = Number(
    raw.mediaID ??
      ("mediaId" in raw ? raw.mediaId : undefined) ??
      ("media_id" in raw ? raw.media_id : undefined),
  );
  const mediaURL = String(
    raw.mediaURL ??
      ("mediaUrl" in raw ? raw.mediaUrl : undefined) ??
      ("media_url" in raw ? raw.media_url : undefined) ??
      ("url" in raw ? raw.url : undefined) ??
      "",
  ).trim();

  if (!Number.isFinite(mediaID) || mediaID <= 0 || !mediaURL) {
    return null;
  }

  return { mediaID, mediaURL };
}

function mapMessage(raw: RawMessage): ChatMessage {
  const parentMessageId = raw.parentMessage ?? raw.parentMessageId;
  const stickerId = raw.sticker;
  const stickerData = mapSticker(raw.stickerData);
  const media = Array.isArray(raw.media)
    ? raw.media.map(mapAttachment).filter((item): item is MessageAttachment => Boolean(item))
    : [];
  const files = Array.isArray(raw.files)
    ? raw.files.map(mapAttachment).filter((item): item is MessageAttachment => Boolean(item))
    : [];
  const reactions = Array.isArray(raw.reactions)
    ? raw.reactions
        .map((item) => ({ type: String(item.type ?? ""), count: parseNumericCount(item.count) }))
        .filter((item) => item.type)
    : [];

  return {
    id: String(raw.id ?? raw.ID ?? ""),
    ...(raw.uid ? { uid: String(raw.uid) } : {}),
    text: String(raw.text ?? raw.Text ?? ""),
    authorName:
      typeof (raw.authorName ?? raw.AuthorName) === "string"
        ? String(raw.authorName ?? raw.AuthorName)
        : undefined,
    ...(parentMessageId !== undefined && parentMessageId !== null
      ? { parentMessageId: String(parentMessageId) }
      : {}),
    ...(raw.chat !== undefined && raw.chat !== null ? { chatId: String(raw.chat) } : {}),
    authorId: String(raw.authorId ?? raw.AuthorID ?? ""),
    ...(stickerId !== undefined && stickerId !== null ? { stickerId: String(stickerId) } : {}),
    ...(stickerData ? { stickerData } : {}),
    media,
    files,
    reactions,
    ...(raw.myReaction ? { myReaction: String(raw.myReaction) } : {}),
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt ?? raw.CreatedAt,
    updatedAt: raw.updatedAt,
  };
}

function normaliseSendMessagePayload(payload: SendMessagePayload): SendMessagePayload {
  if (typeof payload.stickerId === "number") {
    return { stickerId: payload.stickerId };
  }

  const media = Array.isArray(payload.media)
    ? payload.media
        .map((item) => Number(item.mediaID))
        .filter((mediaID) => Number.isFinite(mediaID) && mediaID > 0)
        .map((mediaID) => ({ mediaID }))
    : undefined;
  const files = Array.isArray(payload.files)
    ? payload.files
        .map((item) => Number(item.mediaID))
        .filter((mediaID) => Number.isFinite(mediaID) && mediaID > 0)
        .map((mediaID) => ({ mediaID }))
    : undefined;

  return {
    ...(typeof payload.text === "string" ? { text: payload.text } : {}),
    ...(typeof payload.parentMessageId === "number"
      ? { parentMessageId: payload.parentMessageId }
      : {}),
    ...(typeof payload.stickerId === "number" ? { stickerId: payload.stickerId } : {}),
    ...(media ? { media } : {}),
    ...(files ? { files } : {}),
  };
}

function buildListQuery(options: ListOptions & { after?: number | string } = {}): string {
  const params = new URLSearchParams();
  if (typeof options.limit === "number") params.set("limit", String(options.limit));
  if (typeof options.offset === "number") params.set("offset", String(options.offset));
  if (options.after !== undefined && options.after !== "")
    params.set("after", String(options.after));
  const query = params.toString();
  return query ? `?${query}` : "";
}

function buildStickerPackListQuery(options: StickerPackListOptions = {}): string {
  const params = new URLSearchParams();
  if (options.search?.trim()) params.set("search", options.search.trim());
  if (options.my) params.set("my", "true");
  if (typeof options.limit === "number") params.set("limit", String(options.limit));
  if (typeof options.offset === "number") params.set("offset", String(options.offset));
  const query = params.toString();
  return query ? `?${query}` : "";
}

function normaliseMessageOptions(
  signalOrOptions?: AbortSignal | GetMessagesOptions,
): GetMessagesOptions {
  if (!signalOrOptions) {
    return {};
  }

  if ("aborted" in signalOrOptions) {
    return { signal: signalOrOptions };
  }

  return signalOrOptions;
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
  signalOrOptions?: AbortSignal | GetMessagesOptions,
): Promise<ChatMessage[]> {
  const options = normaliseMessageOptions(signalOrOptions);
  const data = await apiRequest<RawMessage[]>(
    `/api/chats/${encodeURIComponent(chatId)}/messages${buildListQuery(options)}`,
    { ...(options.signal ? { signal: options.signal } : {}) },
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
    { method: "POST", body: normaliseSendMessagePayload(payload) },
    {},
  );

  return mapMessage(data);
}

export async function updateChatMessageText(
  chatId: string,
  messageId: string | number,
  text: string,
): Promise<ChatMessage> {
  const data = await apiRequest<RawMessage>(
    `/api/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(String(messageId))}`,
    { method: "PUT", body: { text } },
    {},
  );

  return mapMessage(data);
}

export async function getStickerPacks(
  options: StickerPackListOptions = {},
): Promise<StickerPack[]> {
  const data = await apiRequest<RawStickerPack[]>(
    `/api/sticker-packs${buildStickerPackListQuery(options)}`,
    { ...(options.signal ? { signal: options.signal } : {}) },
    [],
  );

  return Array.isArray(data)
    ? data.map(mapStickerPack).filter((item): item is StickerPack => Boolean(item))
    : [];
}

export async function createStickerPack(payload: CreateStickerPackPayload): Promise<StickerPack> {
  const data = await apiRequest<RawStickerPack>(
    "/api/sticker-packs",
    { method: "POST", body: { title: payload.title.trim() } },
    {},
  );
  const pack = mapStickerPack(data);
  if (!pack) throw new Error("Не удалось создать стикерпак.");
  return pack;
}

export async function getStickersByPack(
  packId: string | number,
  options: ListOptions = {},
): Promise<Sticker[]> {
  const data = await apiRequest<RawSticker[]>(
    `/api/sticker-packs/${encodeURIComponent(String(packId))}/stickers${buildListQuery(options)}`,
    { ...(options.signal ? { signal: options.signal } : {}) },
    [],
  );

  return Array.isArray(data)
    ? data.map(mapSticker).filter((item): item is Sticker => Boolean(item))
    : [];
}

export async function addStickerToPack(
  packId: string | number,
  payload: AddStickerToPackPayload,
): Promise<Sticker> {
  const body = {
    mediaID: payload.mediaID,
    ...(typeof payload.sortOrder === "number" ? { sortOrder: payload.sortOrder } : {}),
  };
  const data = await apiRequest<RawSticker>(
    `/api/sticker-packs/${encodeURIComponent(String(packId))}/stickers`,
    { method: "POST", body },
    {},
  );
  const sticker = mapSticker(data);
  if (!sticker) throw new Error("Не удалось добавить стикер.");
  return sticker;
}

export async function uploadStickerImage(file: File): Promise<UploadedMedia> {
  const formData = new FormData();
  formData.append("files", file);

  const data = await apiRequest<UploadMediaResponse>(
    "/api/media/upload?for=sticker",
    { method: "POST", body: formData },
    {},
  );
  const uploadedMedia = Array.isArray(data.media) ? data.media : [];
  const uploaded = uploadedMedia.map(mapUploadedMedia).find(Boolean);
  if (!uploaded) throw new Error("Не удалось загрузить изображение стикера.");
  return uploaded;
}

export async function uploadMessageAttachments(files: File[]): Promise<UploadedMedia[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const data = await apiRequest<UploadMediaResponse>(
    "/api/media/upload?for=message",
    { method: "POST", body: formData },
    {},
  );
  const uploadedMedia = Array.isArray(data.media) ? data.media : [];

  return uploadedMedia
    .map((item) => mapUploadedMedia(item))
    .filter((item): item is UploadedMedia => Boolean(item));
}

export async function setMessageReaction(
  chatId: string,
  messageId: string | number,
  type: MessageReactionType | string,
): Promise<ChatMessage> {
  const data = await apiRequest<RawMessage>(
    `/api/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(String(messageId))}/reaction`,
    { method: "PUT", body: { type } },
    {},
  );

  return mapMessage(data);
}

export async function deleteMessageReaction(
  chatId: string,
  messageId: string | number,
): Promise<ChatMessage> {
  const data = await apiRequest<RawMessage>(
    `/api/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(String(messageId))}/reaction`,
    { method: "DELETE" },
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
 * @returns {ChatMessageSocketSubscription} Управляющий объект подписки.
 * @example
 * const subscription = subscribeToChatMessages("5", {
 *   onMessage: (message) => console.log(message.text),
 * });
 * subscription.close();
 */
export function subscribeToChatMessages(
  chatId: string,
  handlers: ChatMessageSocketHandlers,
): ChatMessageSocketSubscription {
  const user = getSessionUser();

  if (!user) {
    return {
      send: () => false,
      isOpen: () => false,
      close: () => {},
    };
  }

  let socket: WebSocket | null = null;
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
      handlers.onOpen?.();
    });

    socket.addEventListener("close", () => {
      handlers.onClose?.();
      if (intentionalClose) return;
      const delay = Math.min(1000 * 2 ** retries, 30_000) + Math.random() * 500;
      retries += 1;
      reconnectTimer = setTimeout(connect, delay);
    });
  }

  connect();

  return {
    send: (payload: SendMessagePayload): boolean => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }

      socket.send(JSON.stringify(normaliseSendMessagePayload(payload)));
      return true;
    },
    isOpen: (): boolean => Boolean(socket && socket.readyState === WebSocket.OPEN),
    close: (): void => {
      intentionalClose = true;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (
        socket &&
        (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
      ) {
        socket.close();
      }
    },
  };
}
