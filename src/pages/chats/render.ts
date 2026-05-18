/**
 * Рендер страницы чатов.
 *
 * Содержит функции генерации HTML и обновления DOM для страницы.
 */
import { chatsState, chatsPageMounted } from "./state";
import { domPatch } from "../../vdom/patch";
import {
  escapeHtml,
  formatChatDayLabel,
  formatChatExactTime,
  getChatDateKey,
  getMessageDeliveryLabel,
  isChatDateToday,
  renderAvatarElement,
} from "./helpers";
import { getFilteredThreads, getSelectedThread, getThreadPreviewState } from "./threads";
import { readPersistedChatsUiState, persistChatsUiState } from "./storage";
import { hasHydratedPersistedChatsUiState, setHasHydratedPersistedChatsUiState } from "./state";
import { t } from "../../state/i18n";
import { formatDisplayName } from "../../utils/display-name";
import { VOICE_WAVEFORM_BARS, getCachedVoiceWaveform } from "./voice-waveform";

/** Возвращает количество непрочитанных входящих сообщений в чате. */
function getUnreadIncomingCount(chatId: string): number {
  return chatsState.unreadIncomingIdsByChatId.get(chatId)?.size ?? 0;
}
import type {
  ChatViewThread,
  ChatViewMessage,
  PersistedChatScrollState,
  ChatViewportAnchor,
} from "./types";

// ---------------------------------------------------------------------------
// Состояние прокрутки (относится к слою рендера и касается только DOM)
// ---------------------------------------------------------------------------

let isSelectedChatPinnedToBottom = true;
let shouldScrollChatToBottom = false;

/** Карта из chatId в последнюю известную позицию прокрутки для этого чата. */
export const chatScrollStateById = new Map<string, PersistedChatScrollState>();

/** Возвращает, закреплён ли выбранный чат внизу. */
export function isSelectedChatPinnedToBottomRef(): boolean {
  return isSelectedChatPinnedToBottom;
}

/** Объект наподобие ref для флага «нужно прокрутить вниз» (чтение/запись). */
export const shouldScrollChatToBottomRef = {
  get: () => shouldScrollChatToBottom,
  set: (value: boolean) => {
    shouldScrollChatToBottom = value;
  },
};

/** Закрепляет выбранный чат внизу и планирует прокрутку. */
export function keepSelectedChatPinnedToBottom(): void {
  isSelectedChatPinnedToBottom = true;
  shouldScrollChatToBottom = true;
}

export function clearScrollState(): void {
  chatScrollStateById.clear();
  isSelectedChatPinnedToBottom = true;
  shouldScrollChatToBottom = false;
}

// ---------------------------------------------------------------------------
// Вспомогательные функции прокрутки DOM
// ---------------------------------------------------------------------------

export function getChatMessagesContainer(root: ParentNode = document): HTMLElement | null {
  const container = root.querySelector(".chat-messages");
  return container instanceof HTMLElement ? container : null;
}

export function setChatMessagesReady(root: ParentNode = document): void {
  const container = getChatMessagesContainer(root);
  if (!container) return;
  container.setAttribute("data-chat-scroll-ready", "true");
}

export function scrollChatToBottom(root: ParentNode = document): void {
  const container = getChatMessagesContainer(root);
  if (!container) return;
  container.scrollTop = container.scrollHeight;
}

export function scheduleScrollChatToBottom(root: ParentNode = document): void {
  const run = (): void => {
    scrollChatToBottom(root);
  };
  run();
  requestAnimationFrame(run);
  window.setTimeout(run, 0);
  window.setTimeout(run, 40);
  window.setTimeout(run, 120);
}

export function captureChatViewportAnchor(root: ParentNode = document): ChatViewportAnchor | null {
  const container = getChatMessagesContainer(root);
  if (!container) return null;

  const messages = Array.from(container.querySelectorAll<HTMLElement>("[data-chat-message-id]"));
  const anchor = messages.find((m) => m.offsetTop + m.offsetHeight > container.scrollTop);
  if (!anchor) return null;

  const messageId = anchor.getAttribute("data-chat-message-id");
  if (!messageId) return null;

  return { messageId, offset: container.scrollTop - anchor.offsetTop };
}

export function restoreChatViewportAnchor(
  anchor: ChatViewportAnchor,
  root: ParentNode = document,
): boolean {
  const container = getChatMessagesContainer(root);
  if (!container) return false;

  const message = container.querySelector<HTMLElement>(
    `[data-chat-message-id="${CSS.escape(anchor.messageId)}"]`,
  );
  if (!message) return false;

  container.scrollTop = message.offsetTop + anchor.offset;
  return true;
}

export function isChatScrolledNearBottom(root: ParentNode = document, threshold = 48): boolean {
  const container = getChatMessagesContainer(root);
  if (!container) return true;
  return container.scrollHeight - (container.scrollTop + container.clientHeight) <= threshold;
}

export function syncSelectedChatPinnedToBottom(root: ParentNode = document): void {
  isSelectedChatPinnedToBottom = isChatScrolledNearBottom(root, 8);
}

export function rememberSelectedChatScroll(root: ParentNode = document): void {
  if (!chatsState.selectedChatId) return;
  const container = getChatMessagesContainer(root);
  if (!container) return;

  syncSelectedChatPinnedToBottom(root);
  const anchor = !isSelectedChatPinnedToBottom ? captureChatViewportAnchor(root) : null;
  chatScrollStateById.set(chatsState.selectedChatId, {
    scrollTop: container.scrollTop,
    pinnedToBottom: isSelectedChatPinnedToBottom,
    anchor: anchor ?? undefined,
  });
  persistChatsUiState(chatsState.selectedChatId, chatScrollStateById);
}

export function restoreSelectedChatScroll(root: ParentNode = document): void {
  if (!chatsState.selectedChatId) return;
  const container = getChatMessagesContainer(root);
  if (!container) return;

  const scrollState = chatScrollStateById.get(chatsState.selectedChatId);
  if (!scrollState) {
    syncSelectedChatPinnedToBottom(root);
    return;
  }

  if (scrollState.pinnedToBottom) {
    container.scrollTop = container.scrollHeight;
    isSelectedChatPinnedToBottom = true;
  } else {
    if (!scrollState.anchor || !restoreChatViewportAnchor(scrollState.anchor, root)) {
      container.scrollTop = scrollState.scrollTop;
    }
    syncSelectedChatPinnedToBottom(root);
  }
}

export function applySelectedChatPersistedViewState(): void {
  if (!chatsState.selectedChatId) {
    isSelectedChatPinnedToBottom = true;
    return;
  }
  const scrollState = chatScrollStateById.get(chatsState.selectedChatId);
  isSelectedChatPinnedToBottom = scrollState?.pinnedToBottom ?? true;
}

// ---------------------------------------------------------------------------
// Восстановление сохранённого состояния UI
// ---------------------------------------------------------------------------

export function hydratePersistedChatsUiState(): void {
  if (hasHydratedPersistedChatsUiState) return;

  const persisted = readPersistedChatsUiState();
  if (!persisted) {
    setHasHydratedPersistedChatsUiState(true);
    return;
  }

  chatsState.unreadIncomingIdsByChatId = new Map();
  chatScrollStateById.clear();

  Object.entries(persisted.scrollStateByChatId ?? {}).forEach(([chatId, scrollState]) => {
    if (
      scrollState &&
      typeof scrollState.scrollTop === "number" &&
      typeof scrollState.pinnedToBottom === "boolean"
    ) {
      chatScrollStateById.set(chatId, scrollState);
    }
  });

  const selectedScrollState = chatScrollStateById.get(chatsState.selectedChatId);
  if (selectedScrollState) {
    isSelectedChatPinnedToBottom = selectedScrollState.pinnedToBottom;
  }

  setHasHydratedPersistedChatsUiState(true);
}

// ---------------------------------------------------------------------------
// Вспомогательные функции рендера HTML
// ---------------------------------------------------------------------------

function renderMessages(thread?: ChatViewThread): string {
  if (!thread) {
    return `<div class="chat-view__empty">${t("chats.emptySelect")}</div>`;
  }

  if (chatsState.loadingMessages && thread.source === "api" && !thread.messages) {
    return `<div class="chat-view__loading">${t("chats.loadingMessages")}</div>`;
  }

  const messages = thread.messages ?? [];

  if (!messages.length) {
    return `<div class="chat-view__empty">${t("chats.emptyMessages")}</div>`;
  }

  let previousDateKey = "";

  return messages
    .map((message: ChatViewMessage) => {
      const dateKey = getChatDateKey(message.createdAt);
      const divider =
        dateKey && dateKey !== previousDateKey
          ? renderMessageDateDivider(message.createdAt, dateKey)
          : "";
      previousDateKey = dateKey || previousDateKey;
      return `${divider}${renderMessageBubble(message)}`;
    })
    .join("");
}

function renderMessageDateDivider(value: string | undefined, dateKey: string): string {
  const label = formatChatDayLabel(value);
  if (!label) return "";

  return `
    <div
      class="chat-date-divider"
      data-chat-day-divider
      data-chat-date-key="${escapeHtml(dateKey)}"
      data-chat-date-label="${escapeHtml(label)}"
      data-chat-date-is-today="${isChatDateToday(value) ? "true" : "false"}"
    >
      <span class="chat-date-divider__label">${escapeHtml(label)}</span>
    </div>
  `;
}

function renderMessageBubble(message: ChatViewMessage): string {
  const isFailed = message.deliveryState === "failed";
  const dateLabel = formatChatDayLabel(message.createdAt);
  const dateKey = getChatDateKey(message.createdAt);
  const exactTime = formatChatExactTime(message.createdAt);

  return `
    <article
      class="chat-bubble${message.isOwn ? " chat-bubble--own" : ""}${isFailed ? " chat-bubble--failed" : ""}"
      data-chat-message-id="${escapeHtml(message.id)}"
      data-chat-date-key="${escapeHtml(dateKey)}"
      data-chat-date-label="${escapeHtml(dateLabel)}"
      data-chat-date-is-today="${isChatDateToday(message.createdAt) ? "true" : "false"}"
    >
      ${renderAvatarElement("chat-bubble__avatar", message.authorName, message.avatarLink)}
      <div class="chat-bubble__body">
        <h3 class="chat-bubble__author">
          <a
            class="chat-bubble__author-link"
            href="${escapeHtml(message.profilePath ?? (message.isOwn ? "/profile" : "#"))}"
            data-link
          >
            ${escapeHtml(formatDisplayName(message.authorName))}
          </a>
        </h3>
        ${message.text ? `<p class="chat-bubble__text">${escapeHtml(message.text)}</p>` : ""}
        ${renderVoiceAttachment(message)}
      </div>
      <div class="chat-bubble__meta">
        <time
          class="chat-bubble__time"
          ${message.createdAt ? `datetime="${escapeHtml(message.createdAt)}"` : ""}
          ${exactTime ? `data-tooltip="${escapeHtml(exactTime)}"` : ""}
        >${escapeHtml(getMessageDeliveryLabel(message))}</time>
        ${
          isFailed
            ? `<button
                type="button"
                class="chat-bubble__retry"
                data-chat-retry-message="${escapeHtml(message.id)}"
                aria-label="${t("chats.retryAria")}"
                title="${t("chats.retry")}"
               >↻</button>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderVoiceAttachment(message: ChatViewMessage): string {
  if (!message.voice?.url) return "";
  const label = t("chats.voiceMessage");
  const waveform = message.voice.waveform ?? getCachedVoiceWaveform(message.voice.url);
  const durationLabel = message.voice.durationMs
    ? `0:00 / ${formatVoiceRecordingTime(message.voice.durationMs)}`
    : "0:00 / 0:00";

  return `
    <div class="chat-voice" data-chat-voice-player data-voice-duration-ms="${escapeHtml(String(message.voice.durationMs ?? 0))}" style="--voice-progress: 0%;">
      <div class="chat-voice__card">
        <button
          type="button"
          class="chat-voice__play"
          data-chat-voice-toggle
          aria-label="${escapeHtml(label)}"
          title="${escapeHtml(label)}"
        >
          <span class="chat-voice__play-icon" aria-hidden="true"></span>
        </button>
        <button
          type="button"
          class="chat-voice__waveform${waveform?.length ? " chat-voice__waveform--ready" : ""}"
          data-chat-voice-seek
          aria-label="${escapeHtml(label)}"
        >
          ${renderVoiceWaveform(waveform)}
        </button>
        <span class="chat-voice__time" data-chat-voice-time>${escapeHtml(durationLabel)}</span>
        <audio
          class="chat-voice__audio"
          preload="metadata"
          src="${escapeHtml(message.voice.url)}"
          data-chat-voice-audio
        ></audio>
      </div>
    </div>
  `;
}

function renderVoiceWaveform(waveform?: number[]): string {
  const heights = waveform?.length
    ? waveform
    : Array.from({ length: VOICE_WAVEFORM_BARS }, () => 8);
  return heights
    .map(
      (height) =>
        `<span class="chat-voice__bar" style="height: ${escapeHtml(String(height))}px;"></span>`,
    )
    .join("");
}

function formatVoiceRecordingTime(valueMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(valueMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatVoiceRecordingLiveTime(valueMs: number): string {
  const safeMs = Math.max(0, Math.floor(valueMs));
  const totalTenths = Math.floor(safeMs / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function renderCompose(selectedThread: ChatViewThread, composeDraft: string): string {
  const recording =
    chatsState.voiceRecording?.chatId === selectedThread.id ? chatsState.voiceRecording : undefined;
  const voiceDraft =
    chatsState.voiceDraft?.chatId === selectedThread.id ? chatsState.voiceDraft : undefined;

  if (voiceDraft) {
    return `
      <div class="chat-compose chat-compose--recording">
        <button
          type="button"
          class="chat-compose__voice-cancel"
          data-chat-voice-draft-cancel
          aria-label="${t("chats.voiceCancel")}"
          title="${t("chats.voiceCancel")}"
        >×</button>
        <div class="chat-compose__recording" role="status" aria-live="polite">
          <span class="chat-compose__record-dot chat-compose__record-dot--ready" aria-hidden="true"></span>
          <span class="chat-compose__record-time">${escapeHtml(formatVoiceRecordingLiveTime(voiceDraft.durationMs))}</span>
        </div>
        <button
          type="button"
          class="chat-compose__send chat-compose__send--voice"
          data-chat-voice-draft-send
          aria-label="${t("chats.voiceSend")}"
          title="${t("chats.voiceSend")}"
        >${t("chats.send")}</button>
      </div>
    `;
  }

  if (recording) {
    return `
      <div class="chat-compose chat-compose--recording">
        <button
          type="button"
          class="chat-compose__voice-cancel"
          data-chat-voice-cancel
          aria-label="${t("chats.voiceCancel")}"
          title="${t("chats.voiceCancel")}"
        >×</button>
        <div class="chat-compose__recording" role="status" aria-live="polite">
          <span class="chat-compose__record-dot" aria-hidden="true"></span>
          <span class="chat-compose__record-time">${escapeHtml(formatVoiceRecordingLiveTime(recording.elapsedMs))}</span>
        </div>
        <button
          type="button"
          class="chat-compose__send chat-compose__send--voice"
          data-chat-voice-send
          aria-label="${t("chats.voiceSend")}"
          title="${t("chats.voiceSend")}"
        >${t("chats.send")}</button>
      </div>
    `;
  }

  return `
    <form class="chat-compose" data-chat-compose-form>
      <input
        class="chat-compose__field"
        type="text"
        name="message"
        value="${escapeHtml(composeDraft)}"
        placeholder="${t("chats.typeMessage")}"
        autocomplete="off"
      >
      <input
        class="chat-compose__voice-file"
        type="file"
        accept="audio/*"
        data-chat-voice-file
        hidden
      >
      <button
        type="button"
        class="chat-compose__voice"
        data-chat-voice-record
        aria-label="${t("chats.voiceStart")}"
        title="${t("chats.voiceStart")}"
      >
        <img src="/assets/img/icons/mic.svg" alt="">
      </button>
      <button type="submit" class="chat-compose__send">${t("chats.send")}</button>
    </form>
  `;
}

function renderScrollControls(thread?: ChatViewThread): string {
  if (!thread || isSelectedChatPinnedToBottom) return "";

  const hasUnread = getUnreadIncomingCount(thread.id) > 0;

  return `
    ${
      hasUnread
        ? `<div class="chat-scroll-indicator-wrap">
             <button type="button" class="chat-new-indicator" data-chat-scroll-bottom>
               ${t("chats.newMessages")}
             </button>
           </div>`
        : ""
    }
    <div class="chat-scroll-button-wrap">
      <button
        type="button"
        class="chat-scroll-bottom-button"
        data-chat-scroll-bottom
        aria-label="${t("chats.scrollDown")}"
        title="${t("chats.scrollDown")}"
      >↓</button>
    </div>
  `;
}

function renderPresenceDot(thread: ChatViewThread, className: string): string {
  const statusClass = thread.isOnline ? `${className}--online` : `${className}--offline`;
  const label = thread.isOnline ? t("chats.online") : t("chats.offline");
  return `<span class="${className} ${statusClass}" aria-label="${label}" title="${label}"></span>`;
}

function renderPresenceStatus(thread: ChatViewThread): string {
  return thread.isOnline ? t("chats.online") : t("chats.offline");
}

function renderThreadsList(threads: ChatViewThread[]): string {
  if (!threads.length) {
    return `<p class="chats-list__empty">${chatsState.query.trim() ? t("friends.noneFound") : t("common.emptyList")}</p>`;
  }

  return threads
    .map((thread) => {
      const isActive = thread.id === chatsState.selectedChatId;
      const previewState = getThreadPreviewState(thread);
      const threadTitle = formatDisplayName(thread.title);

      return `
        <button
          type="button"
          class="chat-thread${isActive ? " chat-thread--active" : ""}"
          data-chat-select="${escapeHtml(thread.id)}"
          data-key="${escapeHtml(thread.id)}"
        >
          <span class="chat-thread__avatar-wrap">
            ${renderAvatarElement("chat-thread__avatar", thread.title, thread.avatarLink)}
            ${renderPresenceDot(thread, "chat-thread__presence")}
          </span>
          <div class="chat-thread__content">
            <strong class="chat-thread__title">${escapeHtml(threadTitle)}</strong>
            <div class="chat-thread__meta">
              <span class="chat-thread__preview">
                ${
                  previewState.isOwn
                    ? `<span class="chat-thread__preview-prefix">${t("chats.you")}</span> `
                    : ""
                }
                ${escapeHtml(previewState.text)}
              </span>
              <time
                class="chat-thread__time"
                ${previewState.timeTooltip ? `data-tooltip="${escapeHtml(previewState.timeTooltip)}"` : ""}
              >${escapeHtml(previewState.timeLabel)}</time>
            </div>
          </div>
        </button>
      `;
    })
    .join("");
}

/** Рендерит внутреннее содержимое страницы чатов (список чатов + область сообщений). */
export function renderChatsContent(): string {
  const filteredThreads = getFilteredThreads();
  const selectedThread = getSelectedThread(filteredThreads);
  const composeDraft = selectedThread
    ? (chatsState.composeDraftByChatId.get(selectedThread.id) ?? "")
    : "";
  const mobileViewClass =
    chatsState.mobileView === "dialog" ? "chats-page--mobile-dialog" : "chats-page--mobile-list";

  if (selectedThread && selectedThread.id !== chatsState.selectedChatId) {
    chatsState.selectedChatId = selectedThread.id;
  }

  return `
    <section class="chats-page ${mobileViewClass} content-card" data-chats-page>
      <aside class="chats-sidebar">
        <h1 class="chats-sidebar__title">${t("chats.title")}</h1>

        <label class="chats-search search-field" aria-label="${t("chats.search")}">
          <img class="chats-search__icon search-field__icon" src="/assets/img/icons/search.svg" alt="">
          <input
            class="chats-search__input search-field__input"
            type="text"
            value="${escapeHtml(chatsState.query)}"
            placeholder="${t("chats.search")}"
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
            ? `<header class="chat-header">
                 <button
                   type="button"
                   class="chat-header__back"
                   data-chat-mobile-back
                   aria-label="${t("chats.backToList")}"
                 >
                   ←
                 </button>
                 <span class="chat-header__avatar-wrap">
                   ${renderAvatarElement(
                     "chat-header__avatar",
                     selectedThread.title,
                     selectedThread.avatarLink,
                   )}
                   ${renderPresenceDot(selectedThread, "chat-header__presence")}
                 </span>
                 <div>
                   <h2 class="chat-header__title">
                     <a
                       class="chat-header__title-link"
                       href="${escapeHtml(selectedThread.profilePath ?? "#")}"
                       data-link
                     >
                       ${escapeHtml(formatDisplayName(selectedThread.title))}
                     </a>
                   </h2>
                   ${
                     chatsState.source === "api"
                       ? `<p class="chat-header__meta">${renderPresenceStatus(selectedThread)}</p>`
                       : chatsState.source === "mock"
                         ? `<p class="chat-header__meta">${t("chats.demoMeta")}</p>`
                         : ""
                   }
                 </div>
               </header>`
            : ""
        }

        <div class="chat-messages" data-chat-scroll-ready="${chatsPageMounted ? "true" : "false"}">
          ${renderMessages(selectedThread)}
        </div>

        <div data-chat-scroll-controls>
          ${renderScrollControls(selectedThread)}
        </div>

        ${
          selectedThread && chatsState.actionErrorMessage
            ? `<p class="chat-compose__status" role="status">
                 ${escapeHtml(chatsState.actionErrorMessage)}
               </p>`
            : ""
        }

        ${selectedThread ? renderCompose(selectedThread, composeDraft) : ""}
      </section>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Патч DOM: заменяет элемент chats-page на месте
// ---------------------------------------------------------------------------

/** Перерендеривает страницу чатов на месте, сохраняя фокус и позицию прокрутки. */
export function refreshChatsPage(root: ParentNode = document): void {
  if (!chatsPageMounted) return;
  const container = root.querySelector("[data-chats-page]");
  if (!(container instanceof HTMLElement)) return;

  // Сохраняем состояние фокуса инпута
  const searchInput = container.querySelector<HTMLInputElement>("[data-chat-search]");
  const searchWasFocused = document.activeElement === searchInput;
  const searchSelectionStart = searchInput?.selectionStart ?? null;
  const searchSelectionEnd = searchInput?.selectionEnd ?? null;

  const composeInput = container.querySelector<HTMLInputElement>(".chat-compose__field");
  const composeWasFocused = document.activeElement === composeInput;
  const composeSelectionStart = composeInput?.selectionStart ?? null;
  const composeSelectionEnd = composeInput?.selectionEnd ?? null;

  // Сохраняем состояние прокрутки перед перерендером
  const currentMessagesContainer = getChatMessagesContainer(container);
  const previousScrollTop = currentMessagesContainer?.scrollTop ?? 0;
  const previousMessagesClientHeight = currentMessagesContainer?.clientHeight ?? 0;
  const previousAnchor =
    !shouldScrollChatToBottom && !isSelectedChatPinnedToBottom
      ? captureChatViewportAnchor(container)
      : null;

  if (chatsState.selectedChatId && currentMessagesContainer) {
    chatScrollStateById.set(chatsState.selectedChatId, {
      scrollTop: previousScrollTop,
      pinnedToBottom: isSelectedChatPinnedToBottom,
    });
  }

  // Патчим DOM на месте — только изменившиеся узлы
  const template = document.createElement("template");
  template.innerHTML = renderChatsContent().trim();
  const next = template.content.firstElementChild;
  if (!(next instanceof HTMLElement)) return;

  domPatch(container, next);

  // Восстанавливаем фокус
  if (searchWasFocused) {
    const nextSearch = container.querySelector<HTMLInputElement>("[data-chat-search]");
    if (nextSearch) {
      nextSearch.focus();
      if (searchSelectionStart !== null && searchSelectionEnd !== null) {
        nextSearch.setSelectionRange(searchSelectionStart, searchSelectionEnd);
      }
    }
  }

  if (composeWasFocused) {
    const nextCompose = container.querySelector<HTMLInputElement>(".chat-compose__field");
    if (nextCompose) {
      nextCompose.focus();
      if (composeSelectionStart !== null && composeSelectionEnd !== null) {
        nextCompose.setSelectionRange(composeSelectionStart, composeSelectionEnd);
      }
    }
  }

  // Восстанавливаем позицию прокрутки
  const nextMessagesContainer = getChatMessagesContainer(container);
  if (!nextMessagesContainer) return;

  if (shouldScrollChatToBottom) {
    const nextMessagesClientHeight = nextMessagesContainer.clientHeight;
    const bottomCompensation = Math.max(0, previousMessagesClientHeight - nextMessagesClientHeight);

    const scrollToBottom = (): void => {
      nextMessagesContainer.scrollTop =
        nextMessagesContainer.scrollHeight -
        nextMessagesContainer.clientHeight +
        bottomCompensation;
    };

    scrollToBottom();
    requestAnimationFrame(scrollToBottom);
    window.setTimeout(scrollToBottom, 0);
    window.setTimeout(scrollToBottom, 40);
    window.setTimeout(scrollToBottom, 120);
    shouldScrollChatToBottom = false;
    isSelectedChatPinnedToBottom = true;
  } else {
    const scrollState = chatsState.selectedChatId
      ? chatScrollStateById.get(chatsState.selectedChatId)
      : undefined;

    if (scrollState && !scrollState.pinnedToBottom) {
      if (!previousAnchor || !restoreChatViewportAnchor(previousAnchor, container)) {
        nextMessagesContainer.scrollTop = scrollState.scrollTop;
      }
      syncSelectedChatPinnedToBottom(container);
    } else {
      nextMessagesContainer.scrollTop = previousScrollTop;
      syncSelectedChatPinnedToBottom(container);
    }
  }

  rememberSelectedChatScroll(container);
}

/** Обновляет только оверлей элементов управления прокруткой без полного перерендера. */
export function refreshScrollControls(root: ParentNode = document): void {
  const container = root.querySelector("[data-chat-scroll-controls]");
  if (!(container instanceof HTMLElement)) return;

  const selectedThread = chatsState.threads.find((t) => t.id === chatsState.selectedChatId);
  container.innerHTML = renderScrollControls(selectedThread);
}
