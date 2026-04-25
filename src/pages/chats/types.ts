/** Одно сообщение, отображаемое в окне чата. */
export type ChatViewMessage = {
  id: string;
  text: string;
  authorName: string;
  isOwn: boolean;
  deliveryState?: "sending" | "failed" | undefined;
  createdAt?: string | undefined;
  avatarLink?: string | undefined;
  profilePath?: string | undefined;
};

/** Элемент треда чата, показываемый в боковой панели и области сообщений. */
export type ChatViewThread = {
  id: string;
  title: string;
  profileId?: string | undefined;
  isFriend?: boolean | undefined;
  avatarLink?: string | undefined;
  preview: string;
  previewIsOwn?: boolean | undefined;
  timeLabel: string;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  source: "api" | "mock";
  messages?: ChatViewMessage[] | undefined;
  profilePath?: string | undefined;
};

/** Метаданные аватара/профиля для известного собеседника в чате. */
export type KnownChatContact = {
  profileId?: string | undefined;
  avatarLink?: string | undefined;
};

/** Снимок позиции прокрутки для одного чата. */
export type PersistedChatScrollState = {
  scrollTop: number;
  pinnedToBottom: boolean;
  anchor?: ChatViewportAnchor | undefined;
};

/** Состояние UI, сохраняемое в sessionStorage между переходами. */
export type PersistedChatsUiState = {
  selectedChatId: string;
  scrollStateByChatId: Record<string, PersistedChatScrollState>;
};

/** Треды чатов, сохраняемые в localStorage для офлайн-режима. */
export type PersistedChatsData = {
  threads: ChatViewThread[];
};

/** Идентифицирует видимое сообщение, используемое для восстановления позиции прокрутки после перерендера. */
export type ChatViewportAnchor = {
  messageId: string;
  offset: number;
};

/** Полное состояние страницы чатов во время выполнения. */
export type ChatsState = {
  loaded: boolean;
  loadingMessages: boolean;
  source: "api" | "mock";
  query: string;
  composeDraftByChatId: Map<string, string>;
  threads: ChatViewThread[];
  selectedChatId: string;
  errorMessage: string;
  actionErrorMessage: string;
  loadedForUserId: string;
  unsubscribeByChatId: Map<string, () => void>;
  unreadIncomingIdsByChatId: Map<string, Set<string>>;
  pendingOutgoingByChatId: Map<
    string,
    Array<{
      localId: string;
      text: string;
      createdAt?: string | undefined;
    }>
  >;
};
