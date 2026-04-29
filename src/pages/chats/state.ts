import { StateManager } from "../../state/StateManager";
import type { ChatsState } from "./types";

function createInitialChatsState(): ChatsState {
  return {
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
}

/** Реактивное состояние страницы чатов. */
export const chatsStore = new StateManager<ChatsState>(createInitialChatsState());

/**
 * Совместимый фасад над chatsStore.
 * Старые чтения/записи `chatsState.x` проходят через StateManager, а вложенные Map/Array
 * остаются теми же объектами для существующей логики сообщений и прокрутки.
 */
export const chatsState = new Proxy({} as ChatsState, {
  get(_target, prop: string | symbol) {
    return (chatsStore.get() as Record<PropertyKey, unknown>)[prop];
  },
  set(_target, prop: string | symbol, value: unknown) {
    chatsStore.patch({ [prop]: value } as Partial<ChatsState>);
    return true;
  },
});

/** Корневой DOM-узел, к которому привязаны обработчики событий чатов. Обновляется в initChats. */
export let chatsRoot: ParentNode = document;

/** Идентификатор setInterval для фонового опроса. */
export let chatsPollIntervalId: number | null = null;

/** Показывает, было ли уже применено сохранённое состояние UI в этой сессии. */
export let hasHydratedPersistedChatsUiState = false;

/**
 * True only after initChats has been called on the rendered page.
 * Guards refreshChatsPage from patching the skeleton during the initial async render.
 */
export let chatsPageMounted = false;

export function setChatsRoot(root: ParentNode): void {
  chatsRoot = root;
}

export function setChatsPollIntervalId(id: number | null): void {
  chatsPollIntervalId = id;
}

export function setHasHydratedPersistedChatsUiState(value: boolean): void {
  hasHydratedPersistedChatsUiState = value;
}

export function setChatsPageMounted(value: boolean): void {
  chatsPageMounted = value;
}

/** Сбрасывает всё изменяемое состояние к начальным значениям. */
export function resetChatsStateMutable(): void {
  chatsState.unsubscribeByChatId.forEach((unsubscribe) => unsubscribe());
  chatsStore.reset(createInitialChatsState());
  setHasHydratedPersistedChatsUiState(false);
  setChatsPageMounted(false);
}
