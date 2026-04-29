/**
 * Страница чатов.
 *
 * Отвечает за:
 * - загрузку списка диалогов и сообщений
 * - восстановление persisted-состояния
 * - подписку на входящие сообщения
 * - фоновое обновление списка чатов
 */
import { renderHeader } from "../../components/header/header";
import { renderSidebar } from "../../components/sidebar/sidebar";
import { getChats, subscribeToChatMessages } from "../../api/chat";
import { getSessionUser } from "../../state/session";
import { prepareAvatarLinks } from "../../utils/avatar";
import { renderFeed } from "../feed/feed";

import {
  chatsState,
  chatsRoot,
  chatsPollIntervalId,
  setChatsRoot,
  setChatsPollIntervalId,
  resetChatsStateMutable,
  setChatsPageMounted,
} from "./state";
import { readPersistedChatsData, persistChatsData } from "./storage";
import { ensureKnownChatContactsLoaded, clearKnownContacts } from "./contacts";
import { mapApiChatsToThreads, mergeApiThreads, applyThreadVisibilityRules } from "./threads";
import { ensureMessagesLoaded, appendIncomingMessage } from "./messages";
import {
  renderChatsContent,
  refreshChatsPage,
  refreshScrollControls,
  restoreSelectedChatScroll,
  rememberSelectedChatScroll,
  hydratePersistedChatsUiState,
  applySelectedChatPersistedViewState,
  clearScrollState,
  setChatMessagesReady,
} from "./render";
import { syncSelectedChatToUrl } from "./helpers";
import { bindChatsEvents } from "./events";

type ChatRoot = (Document | HTMLElement) & {
  __chatsBound?: boolean;
};

// ---------------------------------------------------------------------------
// Сброс состояния
// ---------------------------------------------------------------------------

// Хранит текущую загрузку, чтобы параллельные вызовы не стартовали повторно.
let chatsLoadingPromise: Promise<void> | null = null;

/**
 * Сбрасывает runtime-состояние страницы чатов.
 *
 * @returns {void}
 */
function resetChatsState(): void {
  resetChatsStateMutable();
  clearScrollState();
  clearKnownContacts();
  chatsLoadingPromise = null;
}

// ---------------------------------------------------------------------------
// Восстановление ожидающих исходящих сообщений после офлайн-перезагрузки
// ---------------------------------------------------------------------------

/**
 * Восстанавливает локальные исходящие сообщения после перезагрузки.
 *
 * Нужен для офлайн-сценария, когда пользователь отправил сообщение,
 * но страница была обновлена до подтверждения сервера.
 *
 * @returns {void}
 */
function rebuildPendingOutgoingFromThreads(): void {
  chatsState.pendingOutgoingByChatId.clear();

  chatsState.threads.forEach((thread) => {
    const pending = (thread.messages ?? [])
      .filter(
        (m) =>
          m.isOwn &&
          m.id.startsWith("local-") &&
          (m.deliveryState === "failed" || m.deliveryState === "sending"),
      )
      .map((m) => ({ localId: m.id, text: m.text, createdAt: m.createdAt }));

    if (pending.length) {
      chatsState.pendingOutgoingByChatId.set(thread.id, pending);
    }
  });
}

// ---------------------------------------------------------------------------
// Вспомогательные функции для URL
// ---------------------------------------------------------------------------

/**
 * Возвращает `chatId`, запрошенный через query-параметр.
 *
 * @returns {string} Идентификатор чата или пустая строка.
 */
function getRequestedChatId(): string {
  return new URLSearchParams(window.location.search).get("chatId") ?? "";
}

// ---------------------------------------------------------------------------
// Подписка на WebSocket
// ---------------------------------------------------------------------------

/**
 * Подписывает выбранный чат на WebSocket, если это ещё не сделано.
 *
 * @param {string} chatId Идентификатор чата.
 * @returns {void}
 */
function ensureChatSocketSubscribed(chatId: string): void {
  if (chatsState.source !== "api" || chatsState.unsubscribeByChatId.has(chatId)) return;

  const subscription = subscribeToChatMessages(chatId, {
    onMessage: (message) => appendIncomingMessage(chatId, message),
    onError: () => {
      console.info("[chats] source=ws scope=messages error", { chatId });
    },
  });

  chatsState.unsubscribeByChatId.set(chatId, subscription);
}

// ---------------------------------------------------------------------------
// Фоновый опрос
// ---------------------------------------------------------------------------

/**
 * Фоново обновляет список чатов и сообщения.
 *
 * @returns {Promise<void>}
 */
async function refreshChatsInBackground(): Promise<void> {
  if (!chatsState.loaded || chatsState.source !== "api") return;

  try {
    await ensureKnownChatContactsLoaded();
    const chats = await getChats();
    const listChanged = mergeApiThreads(mapApiChatsToThreads(chats));
    chatsState.threads.forEach((thread) => ensureChatSocketSubscribed(thread.id));

    await Promise.all(
      chatsState.threads.map(async (thread) => {
        await ensureMessagesLoaded(thread.id, { background: true, force: true });
      }),
    );

    if (chatsState.selectedChatId) {
      ensureChatSocketSubscribed(chatsState.selectedChatId);
    }

    applyThreadVisibilityRules();
    persistChatsData(chatsState.threads);

    if (listChanged) refreshChatsPage(chatsRoot);
  } catch (error) {
    console.info("[chats] source=api scope=list background error", {
      error: error instanceof Error ? error.message : "Не получилось обновить список чатов.",
    });
  }
}

/**
 * Запускает интервальный опрос страницы чатов.
 *
 * @returns {void}
 */
function ensureChatsPollingStarted(): void {
  if (chatsPollIntervalId !== null) return;

  const id = window.setInterval(() => {
    if (document.visibilityState === "hidden") return;
    if (!chatsState.loaded || chatsState.source !== "api") return;
    void refreshChatsInBackground();
  }, 3000);

  setChatsPollIntervalId(id);
}

// ---------------------------------------------------------------------------
// Начальная загрузка данных
// ---------------------------------------------------------------------------

/**
 * Выполняет полную начальную загрузку страницы чатов.
 *
 * @returns {Promise<void>}
 */
async function doLoadChats(): Promise<void> {
  const preferredChatId = getRequestedChatId() || chatsState.selectedChatId || "";

  try {
    await ensureKnownChatContactsLoaded();
    const chats = await getChats();
    chatsState.source = "api";
    chatsState.threads = mapApiChatsToThreads(chats);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    const persisted = readPersistedChatsData();
    chatsState.source = "api";
    chatsState.threads = persisted;
    chatsState.selectedChatId =
      chatsState.threads.find((t) => t.id === preferredChatId)?.id ??
      chatsState.threads[0]?.id ??
      "";
    applySelectedChatPersistedViewState();
    chatsState.errorMessage = persisted.length
      ? "Нет соединения с интернетом. Показываем последние сохранённые сообщения."
      : "Нет соединения с интернетом. Сохранённых чатов пока нет.";
    rebuildPendingOutgoingFromThreads();
  }

  chatsState.loaded = true;
  chatsState.threads.forEach((thread) => ensureChatSocketSubscribed(thread.id));

  await Promise.all(
    chatsState.threads.map((thread) => ensureMessagesLoaded(thread.id, { background: true })),
  );

  applyThreadVisibilityRules(preferredChatId);
  applySelectedChatPersistedViewState();
  chatsState.errorMessage =
    chatsState.errorMessage && !chatsState.threads.length ? chatsState.errorMessage : "";
  persistChatsData(chatsState.threads);
  syncSelectedChatToUrl(chatsState.selectedChatId, { replace: true });

  if (chatsState.selectedChatId) {
    await ensureMessagesLoaded(chatsState.selectedChatId);
  }

  rebuildPendingOutgoingFromThreads();
}

/**
 * Гарантирует, что данные чатов загружены и выбранный диалог восстановлен.
 *
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<void>}
 */
async function ensureChatsLoaded(signal?: AbortSignal): Promise<void> {
  const preferredChatId = getRequestedChatId() || chatsState.selectedChatId || "";

  if (chatsState.loaded) {
    if (preferredChatId) {
      const requestedThread = chatsState.threads.find((t) => t.id === preferredChatId);
      if (requestedThread) {
        chatsState.selectedChatId = requestedThread.id;
        applySelectedChatPersistedViewState();
      } else {
        chatsState.loaded = false;
      }
    }
  }

  if (chatsState.loaded) {
    if (chatsState.selectedChatId) {
      await ensureMessagesLoaded(chatsState.selectedChatId, { ...(signal ? { signal } : {}) });
    }
    return;
  }

  // Если загрузка уже идёт, используем тот же Promise вместо повторного запуска.
  if (!chatsLoadingPromise) {
    chatsLoadingPromise = doLoadChats().finally(() => {
      chatsLoadingPromise = null;
    });
  }

  await chatsLoadingPromise;
  signal?.throwIfAborted?.();
}

// ---------------------------------------------------------------------------
// Публичная точка входа рендера
// ---------------------------------------------------------------------------

/**
 * Предзагружает список чатов. Если уже загружено — возвращается мгновенно.
 *
 * @returns {Promise<void>}
 */
export async function prefetchChats(): Promise<void> {
  if (!getSessionUser()) return;
  if (chatsState.loaded) return;
  await ensureChatsLoaded();
}

/**
 * Рендерит полный HTML страницы чатов.
 *
 * @param {Record<string, string>} [_params] Параметры маршрута.
 * @param {AbortSignal} [signal] Сигнал отмены запроса.
 * @returns {Promise<string>} HTML страницы.
 */
export async function renderChats(
  _params?: Record<string, string>,
  signal?: AbortSignal,
): Promise<string> {
  const isAuthorised = getSessionUser() !== null;
  const currentUserId = String(getSessionUser()?.id ?? "");

  if (chatsState.loadedForUserId !== currentUserId) {
    resetChatsState();
    chatsState.loadedForUserId = currentUserId;
  }

  // Не даём фоновому обновлению патчить скелетон, пока асинхронный рендер ещё не завершён.
  setChatsPageMounted(false);

  if (!isAuthorised) return renderFeed();

  hydratePersistedChatsUiState();
  await ensureChatsLoaded(signal);
  await prepareAvatarLinks([
    getSessionUser()?.avatarLink,
    ...chatsState.threads.map((thread) => thread.avatarLink),
    ...chatsState.threads.flatMap((thread) =>
      (thread.messages ?? []).map((message) => message.avatarLink),
    ),
  ]);

  return `
    <div class="app-page app-page--content-wide">
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

// ---------------------------------------------------------------------------
// Обработчики событий
// ---------------------------------------------------------------------------

/**
 * Подключает все обработчики событий для страницы чатов.
 *
 * @param {Document | HTMLElement} root
 */
export function initChats(root: Document | HTMLElement = document): void {
  const bindableRoot = root as ChatRoot;
  setChatsRoot(root);
  setChatsPageMounted(true);
  ensureChatsPollingStarted();

  restoreSelectedChatScroll(root);
  setChatMessagesReady(root);
  refreshScrollControls(root);
  rememberSelectedChatScroll(root);

  if (bindableRoot.__chatsBound) return;
  bindChatsEvents(root);
  bindableRoot.__chatsBound = true;
}
