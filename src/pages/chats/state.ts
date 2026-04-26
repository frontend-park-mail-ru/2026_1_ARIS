import type { ChatsState } from "./types";

/** Изменяемое состояние во время выполнения, общее для всех модулей чатов на этой странице. */
export const chatsState: ChatsState = {
  loaded: false,
  loadingMessages: false,
  source: "mock",
  query: "",
  composeDraftByChatId: new Map(),
  threads: [],
  selectedChatId: "",
  errorMessage: "",
  actionErrorMessage: "",
  loadedForUserId: "",
  unsubscribeByChatId: new Map(),
  unreadIncomingIdsByChatId: new Map(),
  pendingOutgoingByChatId: new Map(),
};

/** Корневой DOM-узел, к которому привязаны обработчики событий чатов. Обновляется в initChats. */
export let chatsRoot: ParentNode = document;

/** Идентификатор setInterval для фонового опроса. */
export let chatsPollIntervalId: number | null = null;

/** Показывает, было ли уже применено сохранённое состояние UI в этой сессии. */
export let hasHydratedPersistedChatsUiState = false;

export function setChatsRoot(root: ParentNode): void {
  chatsRoot = root;
}

export function setChatsPollIntervalId(id: number | null): void {
  chatsPollIntervalId = id;
}

export function setHasHydratedPersistedChatsUiState(value: boolean): void {
  hasHydratedPersistedChatsUiState = value;
}

/** Сбрасывает всё изменяемое состояние к начальным значениям. */
export function resetChatsStateMutable(): void {
  chatsState.unsubscribeByChatId.forEach((unsubscribe) => unsubscribe());
  chatsState.unsubscribeByChatId.clear();
  chatsState.loaded = false;
  chatsState.loadingMessages = false;
  chatsState.source = "mock";
  chatsState.query = "";
  chatsState.composeDraftByChatId.clear();
  chatsState.threads = [];
  chatsState.selectedChatId = "";
  chatsState.errorMessage = "";
  chatsState.actionErrorMessage = "";
  chatsState.unreadIncomingIdsByChatId.clear();
  chatsState.pendingOutgoingByChatId.clear();
  setHasHydratedPersistedChatsUiState(false);
}
