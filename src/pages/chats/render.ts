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
import { getSessionUser } from "../../state/session";
import { formatDisplayName } from "../../utils/display-name";
import { getMediaFileName, isVideoMedia, resolveMediaUrl } from "../../utils/media";
import type { StickerPack } from "../../api/chat";

/** Возвращает количество непрочитанных входящих сообщений в чате. */
function getUnreadIncomingCount(chatId: string): number {
  return chatsState.unreadIncomingIdsByChatId.get(chatId)?.size ?? 0;
}

function isOwnStickerPack(pack?: StickerPack): boolean {
  const currentUserId = getSessionUser()?.id;
  return Boolean(pack?.authorId && currentUserId && pack.authorId === currentUserId);
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

function renderMessageMedia(message: ChatViewMessage): string {
  const media = message.media ?? [];
  const files = message.files ?? [];

  const mediaMarkup = media
    .map((item) => {
      const src = resolveMediaUrl(item.url);
      if (isVideoMedia(item.url, item.mimeType)) {
        return `<video class="chat-bubble__media-item" src="${escapeHtml(src)}" controls preload="metadata"></video>`;
      }
      return `<img class="chat-bubble__media-item" src="${escapeHtml(src)}" alt="" loading="lazy" data-post-image-open>`;
    })
    .join("");

  const filesMarkup = files
    .map((item) => {
      const label = item.name || getMediaFileName(item.url, item.id || t("chats.file"));
      return `
        <a class="chat-bubble__file" href="${escapeHtml(resolveMediaUrl(item.url))}" target="_blank" rel="noopener noreferrer">
          <img class="chat-bubble__file-icon" src="/assets/img/icons/file.svg" alt="" aria-hidden="true">
          <span class="chat-bubble__file-name">${escapeHtml(label)}</span>
        </a>
      `;
    })
    .join("");

  return `
    ${message.stickerData?.url ? `<img class="chat-bubble__sticker" src="${escapeHtml(resolveMediaUrl(message.stickerData.url))}" alt="${t("chats.sticker")}">` : ""}
    ${mediaMarkup ? `<div class="chat-bubble__media">${mediaMarkup}</div>` : ""}
    ${filesMarkup ? `<div class="chat-bubble__files">${filesMarkup}</div>` : ""}
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
        ${renderMessageMedia(message)}
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

function renderComposeAttachments(chatId: string): string {
  const attachments = chatsState.composeAttachmentsByChatId.get(chatId) ?? [];
  if (!attachments.length) return "";

  return `
    <div class="chat-compose-attachments">
      ${attachments
        .map(
          (item) => `
          <div class="chat-compose-attachment">
            ${
              item.kind === "media"
                ? `<img class="chat-compose-attachment__preview" src="${escapeHtml(item.url)}" alt="">`
                : `<img class="chat-compose-attachment__file" src="/assets/img/icons/file.svg" alt="" aria-hidden="true">`
            }
            <span class="chat-compose-attachment__name">${escapeHtml(item.name)}</span>
            <button
              type="button"
              class="chat-compose-attachment__remove"
              data-chat-remove-attachment="${escapeHtml(item.id)}"
              aria-label="${t("chats.removeAttachment")}"
              title="${t("chats.removeAttachment")}"
            >×</button>
          </div>
        `,
        )
        .join("")}
    </div>
  `;
}

const EMOJI_LIST = [
  "😀",
  "😂",
  "🥰",
  "😍",
  "🤩",
  "😎",
  "🥳",
  "😢",
  "😭",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🤝",
  "🙏",
  "❤️",
  "🔥",
  "✨",
  "🎉",
  "😊",
  "🤔",
  "😅",
  "😆",
  "🤣",
  "😇",
  "🥺",
  "😤",
  "😴",
  "🤯",
  "👋",
  "🤗",
  "😌",
  "🤭",
  "🫡",
  "😏",
  "😒",
  "😳",
  "🫣",
  "🤫",
  "🎁",
  "🍕",
  "🍔",
  "🎂",
  "☕",
  "🍺",
  "🐶",
  "🐱",
  "🦊",
  "🌸",
];

function renderEmojiPicker(): string {
  if (!chatsState.emojiPickerOpen) return "";
  return `
    <div class="chat-emoji-picker" data-chat-emoji-picker aria-label="Эмодзи">
      ${EMOJI_LIST.map((emoji) => `<button type="button" class="chat-emoji-picker__item" data-chat-insert-emoji="${escapeHtml(emoji)}" aria-label="${escapeHtml(emoji)}">${emoji}</button>`).join("")}
    </div>
  `;
}

function renderStickerPicker(): string {
  const state = chatsState.stickerPicker;
  if (!state.open) return "";

  const activePack = state.packs.find((pack) => pack.id === state.activePackId) ?? state.packs[0];
  const stickers = activePack ? (state.stickersByPackId.get(activePack.id) ?? []) : [];
  const canAddSticker = isOwnStickerPack(activePack);

  return `
    <section class="chat-stickers" aria-label="${t("chats.stickers")}">
      <div class="chat-stickers__top">
        <input
          class="chat-stickers__search"
          type="search"
          value="${escapeHtml(state.search)}"
          placeholder="${t("chats.searchStickerPacks")}"
          data-chat-sticker-search
        >
        <button type="button" class="chat-stickers__close" data-chat-stickers-close aria-label="${t("common.close")}">×</button>
      </div>

      <div class="chat-stickers__packs">
        ${
          state.loading
            ? `<span class="chat-stickers__empty">${t("chats.loadingStickers")}</span>`
            : state.packs
                .map(
                  (pack) => `
                    <button
                      type="button"
                      class="chat-stickers__pack${pack.id === activePack?.id ? " chat-stickers__pack--active" : ""}"
                      data-chat-sticker-pack="${escapeHtml(pack.id)}"
                    >
                      <span class="chat-stickers__pack-thumb" aria-hidden="true">🎭</span>
                      <span class="chat-stickers__pack-label">${escapeHtml(pack.title || t("chats.stickerPack"))}</span>
                    </button>
                  `,
                )
                .join("") ||
              `<span class="chat-stickers__empty">${t("chats.noStickerPacks")}</span>`
        }
      </div>

      <div class="chat-stickers__grid">
        ${
          state.stickersLoading
            ? `<span class="chat-stickers__empty">${t("chats.loadingStickers")}</span>`
            : stickers
                .map(
                  (sticker) => `
                    <button
                      type="button"
                      class="chat-stickers__item"
                      data-chat-send-sticker="${escapeHtml(sticker.id)}"
                      aria-label="${t("chats.sendSticker")}"
                      title="${t("chats.sendSticker")}"
                    >
                      <img src="${escapeHtml(resolveMediaUrl(sticker.url ?? ""))}" alt="">
                    </button>
                  `,
                )
                .join("") || `<span class="chat-stickers__empty">${t("chats.noStickers")}</span>`
        }
      </div>

      <form class="chat-stickers__create" data-chat-create-sticker-pack>
        <input
          class="chat-stickers__title"
          type="text"
          name="title"
          maxlength="63"
          value="${escapeHtml(state.newPackTitle)}"
          placeholder="${t("chats.newStickerPack")}"
          data-chat-sticker-title
        >
        <button type="submit" class="chat-stickers__create-button" ${state.saving ? "disabled" : ""}>+</button>
      </form>

      ${
        canAddSticker
          ? `
            <div class="chat-stickers__add">
              <button type="button" class="chat-stickers__add-button" data-chat-add-sticker ${state.saving ? "disabled" : ""}>
                ${t("chats.addSticker")}
              </button>
              <input type="file" accept="image/*" data-chat-sticker-file hidden>
            </div>
          `
          : ""
      }

      ${state.errorMessage ? `<p class="chat-stickers__error">${escapeHtml(state.errorMessage)}</p>` : ""}
    </section>
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
          ${renderAvatarElement("chat-thread__avatar", thread.title, thread.avatarLink)}
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
                 ${renderAvatarElement(
                   "chat-header__avatar",
                   selectedThread.title,
                   selectedThread.avatarLink,
                 )}
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
                     chatsState.source === "mock"
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

        ${
          selectedThread
            ? `<form class="chat-compose" data-chat-compose-form>
                 ${renderComposeAttachments(selectedThread.id)}
                 <div class="chat-compose__input-group">
                   <input
                     class="chat-compose__field"
                     type="text"
                     name="message"
                     value="${escapeHtml(composeDraft)}"
                     placeholder="${t("chats.typeMessage")}"
                     autocomplete="off"
                   >
                   <button
                     type="button"
                     class="chat-compose__tool${chatsState.emojiPickerOpen ? " chat-compose__tool--active" : ""}"
                     data-chat-toggle-emoji
                     aria-label="Эмодзи"
                     title="Эмодзи"
                   ><svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="9" stroke="currentColor" stroke-width="1.8"/><circle cx="8.5" cy="9.5" r="1.2" fill="currentColor"/><circle cx="13.5" cy="9.5" r="1.2" fill="currentColor"/><path d="M7.5 13.5c.5 1.5 1.8 2.5 3.5 2.5s3-1 3.5-2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
                   <button
                     type="button"
                     class="chat-compose__tool${chatsState.stickerPicker.open ? " chat-compose__tool--active" : ""}"
                     data-chat-toggle-stickers
                     aria-label="${t("chats.stickers")}"
                     title="${t("chats.stickers")}"
                   ><svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><rect x="2.5" y="2.5" width="13" height="13" rx="3.5" stroke="currentColor" stroke-width="1.8"/><path d="M15.5 7.5H18a1.5 1.5 0 011.5 1.5V18A1.5 1.5 0 0118 19.5H9A1.5 1.5 0 017.5 18v-2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="7.5" cy="8" r="1" fill="currentColor"/><circle cx="11" cy="8" r="1" fill="currentColor"/><path d="M6.5 11c.4 1.2 1.4 2 2.5 2s2.1-.8 2.5-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
                   <button
                     type="button"
                     class="chat-compose__tool"
                     data-chat-pick-attachment
                     aria-label="${t("chats.addAttachment")}"
                     title="${t("chats.addAttachment")}"
                   ><svg width="22" height="22" viewBox="-1 -1 24 24" fill="none" aria-hidden="true"><path d="M19.5 10L10 19.5a6 6 0 01-8.5-8.5l9-9a4 4 0 015.6 5.6L7 17a2 2 0 01-2.8-2.8L13 5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                   <input type="file" multiple data-chat-attachment-input hidden>
                 </div>
                 <button type="submit" class="chat-compose__send">${t("chats.send")}</button>
               </form>
               ${renderEmojiPicker()}
               ${renderStickerPicker()}`
            : ""
        }
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
