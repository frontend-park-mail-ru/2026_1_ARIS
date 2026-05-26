import type {
  ChatMessageSocketSubscription,
  MessageAttachment,
  Sticker,
  StickerPack,
} from "../../api/chat";

/**
 * Типы страницы чатов.
 *
 * Описывают:
 * - структуру тредов и сообщений;
 * - сохранённое состояние интерфейса;
 * - runtime-состояние страницы.
 *
 * Эти типы используют модули `messages`, `render`, `threads` и `state`.
 */

/**
 * Сообщение, подготовленное для отображения в окне чата.
 */
export type ChatViewMessage = {
  /** Уникальный идентификатор сообщения или локальный optimistic id. */
  id: string;
  /** Текст сообщения без форматирования. */
  text: string;
  /** Идентификатор стикера, если сообщение состоит только из стикера. */
  stickerId?: string | undefined;
  /** Данные стикера для отображения. */
  stickerData?: Sticker | undefined;
  /** Фото и видео вложения сообщения. */
  media?: MessageAttachment[] | undefined;
  /** Остальные файловые вложения сообщения. */
  files?: MessageAttachment[] | undefined;
  /** Имя автора, которое показывается в пузыре сообщения. */
  authorName: string;
  /** Флаг собственного сообщения, влияющий на выравнивание и стили. */
  isOwn: boolean;
  /** Состояние доставки для optimistic UI. */
  deliveryState?: "sending" | "failed" | undefined;
  /** Дата создания сообщения в формате ISO. */
  createdAt?: string | undefined;
  /** Ссылка на аватар автора, если она известна. */
  avatarLink?: string | undefined;
  /** Путь к профилю автора для перехода по имени. */
  profilePath?: string | undefined;
  /** Голосовое аудио-вложение сообщения. */
  voice?: ChatVoiceAttachment | undefined;
};

export type ChatVoiceAttachment = {
  /** Идентификатор media на сервере, если он уже известен. */
  mediaID?: number | undefined;
  /** URL аудиофайла для воспроизведения. */
  url: string;
  /** MIME-тип аудио. */
  mimeType: string;
  /** Длительность записи в миллисекундах, если известна локально. */
  durationMs?: number | undefined;
  /** Высоты столбиков реальной волны аудио. */
  waveform?: number[] | undefined;
  /** Локальный Blob нужен для повтора отправки после временной ошибки. */
  blob?: Blob | undefined;
};

export type ChatComposerAttachment = {
  id: string;
  file: File;
  name: string;
  mimeType: string;
  url: string;
  kind: "media" | "file";
};

export type StickerPickerState = {
  open: boolean;
  loading: boolean;
  stickersLoading: boolean;
  errorMessage: string;
  packs: StickerPack[];
  activePackId: string;
  stickersByPackId: Map<string, Sticker[]>;
};

/**
 * Тред чата в представлении страницы.
 *
 * Используется и для списка слева, и для активного диалога справа,
 * поэтому хранит как краткие данные диалога, так и уже загруженные сообщения.
 */
export type ChatViewThread = {
  /** Уникальный идентификатор чата. */
  id: string;
  /** Заголовок диалога для списка и шапки чата. */
  title: string;
  /** Идентификатор профиля собеседника, если его удалось определить. */
  profileId?: string | undefined;
  /** Идентификатор профиля собеседника, который явно вернул backend. */
  interlocutorProfileId?: string | undefined;
  /** Идентификатор аккаунта собеседника, если его вернул backend. */
  interlocutorUserAccountId?: string | undefined;
  /** Признак подтверждённого друга для правил видимости и навигации. */
  isFriend?: boolean | undefined;
  /** Ссылка на аватар собеседника. */
  avatarLink?: string | undefined;
  /** Онлайн ли собеседник в этом приватном чате. */
  isOnline?: boolean | undefined;
  /** Время последнего изменения онлайн-статуса собеседника. */
  lastSeenAt?: string | undefined;
  /** Краткое превью последнего сообщения. */
  preview: string;
  /** Показывает, что превью относится к собственному сообщению. */
  previewIsOwn?: boolean | undefined;
  /** Короткая подпись времени для списка диалогов. */
  timeLabel: string;
  /** Дата создания чата в формате ISO. */
  createdAt?: string | undefined;
  /** Дата последней активности в формате ISO. */
  updatedAt?: string | undefined;
  /** Источник данных: API или локальные моковые данные. */
  source: "api" | "mock";
  /** Уже загруженные сообщения диалога. */
  messages?: ChatViewMessage[] | undefined;
  /** Путь к профилю собеседника. */
  profilePath?: string | undefined;
};

/**
 * Краткая информация об известном собеседнике для подстановки аватара и ссылки на профиль.
 */
export type KnownChatContact = {
  /** Идентификатор профиля собеседника. */
  profileId?: string | undefined;
  /** Ссылка на аватар собеседника. */
  avatarLink?: string | undefined;
};

/**
 * Снимок прокрутки одного диалога.
 */
export type PersistedChatScrollState = {
  /** Текущее значение `scrollTop` контейнера сообщений. */
  scrollTop: number;
  /** Признак того, что чат был закреплён у нижней границы. */
  pinnedToBottom: boolean;
  /** Опорная точка для точного восстановления позиции после перерендера. */
  anchor?: ChatViewportAnchor | undefined;
};

/**
 * Состояние интерфейса, которое сохраняется между переходами внутри вкладки.
 */
export type PersistedChatsUiState = {
  /** Идентификатор выбранного чата. */
  selectedChatId: string;
  /** Карта снимков прокрутки по chatId. */
  scrollStateByChatId: Record<string, PersistedChatScrollState>;
};

/**
 * Список тредов, который сохраняется в `localStorage` для офлайн-режима.
 */
export type PersistedChatsData = {
  /** Набор тредов в нормализованном виде. */
  threads: ChatViewThread[];
};

/**
 * Опорная точка видимого сообщения для восстановления прокрутки после перерендера.
 */
export type ChatViewportAnchor = {
  /** Идентификатор сообщения, выбранного как точка привязки. */
  messageId: string;
  /** Смещение контейнера относительно выбранного сообщения. */
  offset: number;
};

/**
 * Полное runtime-состояние страницы чатов.
 */
export type ChatsState = {
  /** Показывает, были ли уже загружены основные данные страницы. */
  loaded: boolean;
  /** Показывает, что сейчас идёт загрузка сообщений активного диалога. */
  loadingMessages: boolean;
  /** Источник данных: API или локальные моковые данные. */
  source: "api" | "mock";
  /** Текущий поисковый запрос по списку диалогов. */
  query: string;
  /** Активная мобильная панель: список диалогов или открытая переписка. */
  mobileView: "list" | "dialog";
  /** Черновики текста сообщений по chatId. */
  composeDraftByChatId: Map<string, string>;
  /** Выбранные вложения по chatId до отправки сообщения. */
  composeAttachmentsByChatId: Map<string, ChatComposerAttachment[]>;
  /** Открыта ли панель эмодзи. */
  emojiPickerOpen: boolean;
  /** Состояние панели стикеров. */
  stickerPicker: StickerPickerState;
  /** Полный список тредов, известных странице. */
  threads: ChatViewThread[];
  /** Идентификатор выбранного диалога. */
  selectedChatId: string;
  /** Сообщение об общей ошибке страницы. */
  errorMessage: string;
  /** Сообщение об ошибке действия внутри активного чата. */
  actionErrorMessage: string;
  /** Идентификатор пользователя, для которого загружено текущее состояние. */
  loadedForUserId: string;
  /** Карта активных WebSocket-подписок по chatId. */
  unsubscribeByChatId: Map<string, ChatMessageSocketSubscription>;
  /** Непрочитанные входящие сообщения по chatId. */
  unreadIncomingIdsByChatId: Map<string, Set<string>>;
  /** Очередь локально ожидающих отправки сообщений по chatId. */
  pendingOutgoingByChatId: Map<
    string,
    Array<{
      /** Локальный идентификатор optimistic-сообщения. */
      localId: string;
      /** Текст сообщения. */
      text: string;
      /** Голосовое вложение, если отправляется аудиосообщение. */
      voice?: ChatVoiceAttachment | undefined;
      /** ID стикера для повторной отправки отдельного стикер-сообщения. */
      stickerId?: number | undefined;
      /** Время создания локального сообщения в формате ISO. */
      createdAt?: string | undefined;
    }>
  >;
  /** Активная запись голосового сообщения. */
  voiceRecording?: ChatVoiceRecordingState | undefined;
  /** Готовая голосовая запись, ожидающая отправки. */
  voiceDraft?: ChatVoiceDraftState | undefined;
};

export type ChatVoiceDraftState = {
  /** Чат, для которого подготовлена запись. */
  chatId: string;
  /** Локальный аудио Blob. */
  blob: Blob;
  /** URL для локального предпросмотра. */
  localUrl: string;
  /** MIME-тип аудио. */
  mimeType: string;
  /** Длительность записи в миллисекундах. */
  durationMs: number;
};

export type ChatVoiceRecordingState = {
  /** Чат, для которого идёт запись. */
  chatId: string;
  /** MediaRecorder текущей записи. */
  recorder: MediaRecorder;
  /** Поток микрофона, который нужно остановить после записи. */
  stream: MediaStream;
  /** Собранные фрагменты аудио. */
  chunks: Blob[];
  /** MIME-тип, выбранный для записи. */
  mimeType: string;
  /** Время начала записи. */
  startedAt: number;
  /** Текущее прошедшее время в миллисекундах. */
  elapsedMs: number;
  /** Таймер обновления интерфейса записи. */
  timerId: number;
};
