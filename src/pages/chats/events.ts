/**
 * Обработчики событий страницы чатов.
 *
 * Содержит пользовательские сценарии и реакцию интерфейса на действия пользователя.
 */
import {
  addStickerToPack,
  createStickerPack,
  getStickerPacks,
  getStickersByPack,
  sendChatMessage,
  uploadMessageAttachments,
  uploadStickerImage,
} from "../../api/chat";
import type { AttachmentPayload, MessageAttachment, Sticker, StickerPack } from "../../api/chat";
import { ApiError } from "../../api/core/client";
import { getSessionUser } from "../../state/session";
import { chatsState } from "./state";
import { persistChatsData } from "./storage";
import {
  clearUnreadIncoming,
  ensureMessagesLoaded,
  addPendingOutgoing,
  removePendingOutgoing,
  queueOutgoingForRetry,
  dedupeMessagesById,
  retryChatMessage,
  mapMessageToViewMessage,
} from "./messages";
import {
  refreshChatsPage,
  refreshScrollControls,
  rememberSelectedChatScroll,
  syncSelectedChatPinnedToBottom,
  isSelectedChatPinnedToBottomRef,
  keepSelectedChatPinnedToBottom,
  scrollChatToBottom,
} from "./render";
import {
  sortMessagesByCreatedAt,
  isOfflineNetworkError,
  getCurrentUserProfilePath,
  syncSelectedChatToUrl,
} from "./helpers";
import { sortThreadsByUpdatedAt, updateThreadPreview } from "./threads";
import type { ChatComposerAttachment, ChatViewMessage, ChatViewThread } from "./types";
import { openPostImageViewerFromTarget } from "../../utils/image-viewer";

function isMediaAttachment(file: File): boolean {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

function getSelectedThread(): ChatViewThread | undefined {
  return chatsState.threads.find((t) => t.id === chatsState.selectedChatId);
}

function createOptimisticMessage(
  patch: Partial<ChatViewMessage> & Pick<ChatViewMessage, "text">,
): ChatViewMessage {
  const currentUser = getSessionUser();
  const { text, ...rest } = patch;
  return {
    id: `local-${Date.now()}`,
    text,
    authorName: `${currentUser?.firstName ?? "Вы"} ${currentUser?.lastName ?? ""}`.trim(),
    isOwn: true,
    deliveryState: "sending",
    createdAt: new Date().toISOString(),
    avatarLink: currentUser?.avatarLink,
    profilePath: getCurrentUserProfilePath(),
    media: [],
    files: [],
    ...rest,
  };
}

function appendOptimisticMessage(thread: ChatViewThread, message: ChatViewMessage): void {
  if (!thread.messages) thread.messages = [];
  thread.messages = sortMessagesByCreatedAt([...thread.messages, message]);
  addPendingOutgoing(thread.id, message);
  updateThreadPreview(thread);
  sortThreadsByUpdatedAt();
  clearUnreadIncoming(thread.id);
  keepSelectedChatPinnedToBottom();
  queueOutgoingForRetry(thread.id, message);
  persistChatsData(chatsState.threads);
}

async function loadStickersForPack(packId: string, root: Document | HTMLElement): Promise<void> {
  if (!packId || chatsState.stickerPicker.stickersByPackId.has(packId)) return;

  chatsState.stickerPicker.stickersLoading = true;
  chatsState.stickerPicker.errorMessage = "";
  refreshChatsPage(root);

  try {
    const stickers = await getStickersByPack(packId, { limit: 100 });
    chatsState.stickerPicker.stickersByPackId.set(packId, stickers);
  } catch (error) {
    chatsState.stickerPicker.errorMessage =
      error instanceof Error ? error.message : "Не удалось загрузить стикеры.";
  } finally {
    chatsState.stickerPicker.stickersLoading = false;
    refreshChatsPage(root);
  }
}

function isOwnStickerPack(pack?: StickerPack): boolean {
  const currentUserId = getSessionUser()?.id;
  return Boolean(pack?.authorId && currentUserId && pack.authorId === currentUserId);
}

function getActiveStickerPack(): StickerPack | undefined {
  return (
    chatsState.stickerPicker.packs.find(
      (pack) => pack.id === chatsState.stickerPicker.activePackId,
    ) ?? chatsState.stickerPicker.packs[0]
  );
}

async function loadStickerPacks(root: Document | HTMLElement): Promise<void> {
  chatsState.stickerPicker.loading = true;
  chatsState.stickerPicker.errorMessage = "";
  refreshChatsPage(root);

  try {
    const packs = await getStickerPacks({
      search: chatsState.stickerPicker.search,
      limit: 50,
      offset: 0,
    });
    chatsState.stickerPicker.packs = packs;
    const activePackId =
      packs.find((pack) => pack.id === chatsState.stickerPicker.activePackId)?.id ??
      packs[0]?.id ??
      "";
    chatsState.stickerPicker.activePackId = activePackId;
    if (activePackId) await loadStickersForPack(activePackId, root);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      chatsState.stickerPicker.packs = [];
    } else {
      const rawMessage = error instanceof Error ? error.message : "";
      chatsState.stickerPicker.errorMessage =
        rawMessage && !rawMessage.trimStart().startsWith("<")
          ? rawMessage
          : "Не удалось загрузить стикерпаки.";
    }
  } finally {
    chatsState.stickerPicker.loading = false;
    refreshChatsPage(root);
  }
}

function findSticker(stickerId: string): Sticker | undefined {
  for (const stickers of chatsState.stickerPicker.stickersByPackId.values()) {
    const sticker = stickers.find((item) => item.id === stickerId);
    if (sticker) return sticker;
  }
  return undefined;
}

function replaceOptimisticMessage(
  thread: ChatViewThread,
  optimisticMessage: ChatViewMessage,
  message: ChatViewMessage,
): void {
  thread.messages = sortMessagesByCreatedAt(
    dedupeMessagesById(
      (thread.messages ?? []).map((item) =>
        item.id === optimisticMessage.id
          ? {
              ...message,
              isOwn: true,
              profilePath: getCurrentUserProfilePath(),
            }
          : item,
      ),
    ),
  );
  removePendingOutgoing(thread.id, optimisticMessage.id);
  updateThreadPreview(thread);
  sortThreadsByUpdatedAt();
  persistChatsData(chatsState.threads);
}

async function sendStickerMessage(
  thread: ChatViewThread,
  sticker: Sticker,
  root: Document | HTMLElement,
): Promise<void> {
  const optimisticMessage = createOptimisticMessage({
    text: "",
    stickerId: sticker.id,
    stickerData: sticker,
  });

  appendOptimisticMessage(thread, optimisticMessage);
  chatsState.stickerPicker.open = false;
  refreshChatsPage(root);

  try {
    const message = await sendChatMessage(thread.id, { stickerId: Number(sticker.id) });
    replaceOptimisticMessage(thread, optimisticMessage, mapMessageToViewMessage(message, thread));
    refreshChatsPage(root);
  } catch (error) {
    console.error("[chats] source=api scope=send-sticker error", error);
    thread.messages = (thread.messages ?? []).map((item) =>
      item.id === optimisticMessage.id ? { ...item, deliveryState: "failed" as const } : item,
    );
    queueOutgoingForRetry(thread.id, { ...optimisticMessage, deliveryState: "failed" });
    updateThreadPreview(thread);
    persistChatsData(chatsState.threads);
    refreshChatsPage(root);
  }
}

function buildLocalAttachment(file: File): ChatComposerAttachment {
  const kind = isMediaAttachment(file) ? "media" : "file";
  return {
    id: `attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    name: file.name,
    mimeType: file.type,
    url: kind === "media" ? URL.createObjectURL(file) : "",
    kind,
  };
}

function buildOptimisticAttachment(item: ChatComposerAttachment): MessageAttachment {
  return {
    id: item.id,
    uid: item.id,
    mimeType: item.mimeType,
    url: item.url || item.name,
    name: item.name,
  };
}

async function uploadComposerAttachments(
  attachments: ChatComposerAttachment[],
): Promise<{ media: AttachmentPayload[]; files: AttachmentPayload[] }> {
  const mediaItems = attachments.filter((item) => item.kind === "media");
  const fileItems = attachments.filter((item) => item.kind === "file");
  const uploaded = await uploadMessageAttachments(
    [...mediaItems, ...fileItems].map((item) => item.file),
  );
  const media = uploaded.slice(0, mediaItems.length).map((item) => ({ mediaID: item.mediaID }));
  const files = uploaded
    .slice(mediaItems.length, mediaItems.length + fileItems.length)
    .map((item) => ({ mediaID: item.mediaID }));
  return { media, files };
}

export function bindChatsEvents(root: Document | HTMLElement): void {
  root.addEventListener("input", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches("[data-chat-search]")) {
      chatsState.query = target.value;
      refreshChatsPage(root);
      return;
    }

    if (target.matches(".chat-compose__field") && chatsState.selectedChatId) {
      chatsState.composeDraftByChatId.set(chatsState.selectedChatId, target.value);
      return;
    }

    if (target.matches("[data-chat-sticker-search]")) {
      chatsState.stickerPicker.search = target.value;
      void loadStickerPacks(root);
      return;
    }

    if (target.matches("[data-chat-sticker-title]")) {
      chatsState.stickerPicker.newPackTitle = target.value;
    }
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (chatsState.emojiPickerOpen) {
      const insidePicker = Boolean(target.closest("[data-chat-emoji-picker]"));
      const insideToggle = Boolean(target.closest("[data-chat-toggle-emoji]"));
      if (!insidePicker && !insideToggle) {
        chatsState.emojiPickerOpen = false;
        refreshChatsPage(root);
        return;
      }
    }

    if (chatsState.stickerPicker.open) {
      const insidePicker = Boolean(target.closest(".chat-stickers"));
      const insideToggle = Boolean(target.closest("[data-chat-toggle-stickers]"));
      if (!insidePicker && !insideToggle) {
        chatsState.stickerPicker.open = false;
        refreshChatsPage(root);
        return;
      }
    }

    if (target.closest("[data-post-image-open]")) {
      if (openPostImageViewerFromTarget(target)) return;
    }

    const scrollBottomButton = target.closest("[data-chat-scroll-bottom]");
    if (scrollBottomButton instanceof HTMLButtonElement) {
      if (chatsState.selectedChatId) clearUnreadIncoming(chatsState.selectedChatId);
      keepSelectedChatPinnedToBottom();
      persistChatsData(chatsState.threads);
      refreshChatsPage(root);
      requestAnimationFrame(() => {
        scrollChatToBottom(root);
        rememberSelectedChatScroll(root);
      });
      return;
    }

    const mobileBackButton = target.closest("[data-chat-mobile-back]");
    if (mobileBackButton instanceof HTMLButtonElement) {
      chatsState.mobileView = "list";
      syncSelectedChatToUrl("");
      rememberSelectedChatScroll(root);
      refreshChatsPage(root);
      return;
    }

    const chatButton = target.closest("[data-chat-select]");
    if (chatButton instanceof HTMLButtonElement) {
      const chatId = chatButton.getAttribute("data-chat-select");
      if (!chatId) return;

      if (chatId === chatsState.selectedChatId) {
        chatsState.mobileView = "dialog";
        keepSelectedChatPinnedToBottom();
        syncSelectedChatToUrl(chatId);
        refreshChatsPage(root);
        return;
      }

      chatsState.selectedChatId = chatId;
      chatsState.mobileView = "dialog";
      clearUnreadIncoming(chatId);
      keepSelectedChatPinnedToBottom();
      persistChatsData(chatsState.threads);
      syncSelectedChatToUrl(chatId);
      refreshChatsPage(root);
      void ensureMessagesLoaded(chatId).then(() => refreshChatsPage(root));
      return;
    }

    const retryButton = target.closest("[data-chat-retry-message]");
    if (retryButton instanceof HTMLButtonElement && chatsState.selectedChatId) {
      const localMessageId = retryButton.getAttribute("data-chat-retry-message");
      if (!localMessageId) return;
      void retryChatMessage(chatsState.selectedChatId, localMessageId);
      return;
    }

    const pickAttachmentButton = target.closest("[data-chat-pick-attachment]");
    if (pickAttachmentButton instanceof HTMLButtonElement) {
      root.querySelector<HTMLInputElement>("[data-chat-attachment-input]")?.click();
      return;
    }

    const removeAttachmentButton = target.closest("[data-chat-remove-attachment]");
    if (removeAttachmentButton instanceof HTMLButtonElement && chatsState.selectedChatId) {
      const attachmentId = removeAttachmentButton.getAttribute("data-chat-remove-attachment");
      const attachments =
        chatsState.composeAttachmentsByChatId.get(chatsState.selectedChatId) ?? [];
      const removed = attachments.find((item) => item.id === attachmentId);
      if (removed?.url) URL.revokeObjectURL(removed.url);
      const next = attachments.filter((item) => item.id !== attachmentId);
      if (next.length) {
        chatsState.composeAttachmentsByChatId.set(chatsState.selectedChatId, next);
      } else {
        chatsState.composeAttachmentsByChatId.delete(chatsState.selectedChatId);
      }
      refreshChatsPage(root);
      return;
    }

    const toggleEmojiButton = target.closest("[data-chat-toggle-emoji]");
    if (toggleEmojiButton instanceof HTMLButtonElement) {
      chatsState.emojiPickerOpen = !chatsState.emojiPickerOpen;
      if (chatsState.emojiPickerOpen) chatsState.stickerPicker.open = false;
      refreshChatsPage(root);
      return;
    }

    const emojiItemButton = target.closest("[data-chat-insert-emoji]");
    if (emojiItemButton instanceof HTMLButtonElement) {
      const emoji = emojiItemButton.getAttribute("data-chat-insert-emoji") ?? "";
      const composeInput = (
        root instanceof Document ? root : (root.ownerDocument ?? document)
      ).querySelector<HTMLInputElement>("[data-chats-page] .chat-compose__field");
      if (composeInput && emoji) {
        const start = composeInput.selectionStart ?? composeInput.value.length;
        const end = composeInput.selectionEnd ?? composeInput.value.length;
        const before = composeInput.value.slice(0, start);
        const after = composeInput.value.slice(end);
        composeInput.value = before + emoji + after;
        composeInput.selectionStart = composeInput.selectionEnd = start + emoji.length;
        composeInput.dispatchEvent(new Event("input", { bubbles: true }));
        const chatId = chatsState.selectedChatId;
        if (chatId) chatsState.composeDraftByChatId.set(chatId, composeInput.value);
        composeInput.focus();
      }
      return;
    }

    const toggleStickersButton = target.closest("[data-chat-toggle-stickers]");
    if (toggleStickersButton instanceof HTMLButtonElement) {
      chatsState.stickerPicker.open = !chatsState.stickerPicker.open;
      if (chatsState.stickerPicker.open) chatsState.emojiPickerOpen = false;
      refreshChatsPage(root);
      if (chatsState.stickerPicker.open && !chatsState.stickerPicker.packs.length) {
        void loadStickerPacks(root);
      }
      return;
    }

    const closeStickersButton = target.closest("[data-chat-stickers-close]");
    if (closeStickersButton instanceof HTMLButtonElement) {
      chatsState.stickerPicker.open = false;
      refreshChatsPage(root);
      return;
    }

    const stickerPackButton = target.closest("[data-chat-sticker-pack]");
    if (stickerPackButton instanceof HTMLButtonElement) {
      const packId = stickerPackButton.getAttribute("data-chat-sticker-pack") ?? "";
      chatsState.stickerPicker.activePackId = packId;
      refreshChatsPage(root);
      void loadStickersForPack(packId, root);
      return;
    }

    const stickerButton = target.closest("[data-chat-send-sticker]");
    if (stickerButton instanceof HTMLButtonElement) {
      const stickerId = stickerButton.getAttribute("data-chat-send-sticker") ?? "";
      const sticker = findSticker(stickerId);
      const selectedThread = getSelectedThread();
      if (!sticker || !selectedThread) return;
      void sendStickerMessage(selectedThread, sticker, root);
      return;
    }

    const addStickerButton = target.closest("[data-chat-add-sticker]");
    if (addStickerButton instanceof HTMLButtonElement) {
      if (!isOwnStickerPack(getActiveStickerPack())) {
        chatsState.stickerPicker.errorMessage = "Добавлять стикеры можно только в свой стикерпак.";
        refreshChatsPage(root);
        return;
      }
      root.querySelector<HTMLInputElement>("[data-chat-sticker-file]")?.click();
      return;
    }
  });

  root.addEventListener("change", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.matches("[data-chat-attachment-input]") && chatsState.selectedChatId) {
      const files = Array.from(target.files ?? []);
      if (!files.length) return;
      const current = chatsState.composeAttachmentsByChatId.get(chatsState.selectedChatId) ?? [];
      const next = current.concat(files.map(buildLocalAttachment)).slice(0, 10);
      chatsState.composeAttachmentsByChatId.set(chatsState.selectedChatId, next);
      target.value = "";
      refreshChatsPage(root);
      return;
    }

    if (target.matches("[data-chat-sticker-file]")) {
      const file = target.files?.[0] ?? null;
      const packId = chatsState.stickerPicker.activePackId;
      const activePack = getActiveStickerPack();
      target.value = "";
      if (!file || !packId) return;
      if (!isOwnStickerPack(activePack)) {
        chatsState.stickerPicker.errorMessage = "Добавлять стикеры можно только в свой стикерпак.";
        refreshChatsPage(root);
        return;
      }
      if (!file.type.startsWith("image/")) {
        chatsState.stickerPicker.errorMessage = "Стикером может быть только изображение.";
        refreshChatsPage(root);
        return;
      }

      chatsState.stickerPicker.saving = true;
      chatsState.stickerPicker.errorMessage = "";
      refreshChatsPage(root);

      void uploadStickerImage(file)
        .then((uploaded) => addStickerToPack(packId, { mediaID: uploaded.mediaID }))
        .then((sticker) => {
          const current = chatsState.stickerPicker.stickersByPackId.get(packId) ?? [];
          chatsState.stickerPicker.stickersByPackId.set(packId, current.concat(sticker));
        })
        .catch((error: unknown) => {
          chatsState.stickerPicker.errorMessage =
            error instanceof Error ? error.message : "Не удалось добавить стикер.";
        })
        .finally(() => {
          chatsState.stickerPicker.saving = false;
          refreshChatsPage(root);
        });
    }
  });

  root.addEventListener(
    "scroll",
    (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains("chat-messages")) return;

      const wasPinnedToBottom = isSelectedChatPinnedToBottomRef();
      syncSelectedChatPinnedToBottom(root);
      rememberSelectedChatScroll(root);

      if (wasPinnedToBottom !== isSelectedChatPinnedToBottomRef()) {
        refreshScrollControls(root);
        return;
      }

      if (chatsState.selectedChatId && isSelectedChatPinnedToBottomRef()) {
        if (chatsState.unreadIncomingIdsByChatId.get(chatsState.selectedChatId)?.size) {
          clearUnreadIncoming(chatsState.selectedChatId);
          refreshChatsPage(root);
        }
      }
    },
    true,
  );

  root.addEventListener("submit", (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;

    if (target.matches("[data-chat-create-sticker-pack]")) {
      event.preventDefault();
      const title = String(new FormData(target).get("title") ?? "").trim();
      if (!title) return;

      chatsState.stickerPicker.saving = true;
      chatsState.stickerPicker.errorMessage = "";
      refreshChatsPage(root);

      void createStickerPack({ title })
        .then((pack) => {
          chatsState.stickerPicker.packs = [pack, ...chatsState.stickerPicker.packs];
          chatsState.stickerPicker.activePackId = pack.id;
          chatsState.stickerPicker.newPackTitle = "";
          chatsState.stickerPicker.stickersByPackId.set(pack.id, []);
        })
        .catch((error: unknown) => {
          chatsState.stickerPicker.errorMessage =
            error instanceof Error ? error.message : "Не удалось создать стикерпак.";
        })
        .finally(() => {
          chatsState.stickerPicker.saving = false;
          refreshChatsPage(root);
        });
      return;
    }

    if (!target.matches("[data-chat-compose-form]")) return;

    event.preventDefault();

    const selectedThread = chatsState.threads.find((t) => t.id === chatsState.selectedChatId);
    if (!selectedThread) return;

    const formData = new FormData(target);
    const text = String(formData.get("message") ?? "").trim();
    const attachments = chatsState.composeAttachmentsByChatId.get(selectedThread.id) ?? [];
    if (!text && !attachments.length) return;

    chatsState.actionErrorMessage = "";

    const optimisticMessage = createOptimisticMessage({
      text,
      media: attachments.filter((item) => item.kind === "media").map(buildOptimisticAttachment),
      files: attachments.filter((item) => item.kind === "file").map(buildOptimisticAttachment),
    });

    appendOptimisticMessage(selectedThread, optimisticMessage);
    chatsState.composeDraftByChatId.set(selectedThread.id, "");
    chatsState.composeAttachmentsByChatId.delete(selectedThread.id);
    target.reset();
    refreshChatsPage(root);
    requestAnimationFrame(() => {
      root.querySelector<HTMLInputElement>(".chat-compose__field")?.focus();
    });

    if (selectedThread.source !== "api") return;

    const sendPromise = attachments.length
      ? uploadComposerAttachments(attachments).then(({ media, files }) =>
          sendChatMessage(selectedThread.id, {
            ...(text ? { text } : {}),
            ...(media.length ? { media } : {}),
            ...(files.length ? { files } : {}),
          }),
        )
      : sendChatMessage(selectedThread.id, { text });

    void sendPromise
      .then((message) => {
        console.info("[chats] source=api scope=send", {
          chatId: selectedThread.id,
          messageId: message.id,
        });

        replaceOptimisticMessage(
          selectedThread,
          optimisticMessage,
          mapMessageToViewMessage(message, selectedThread),
        );
        attachments.forEach((item) => {
          if (item.url) URL.revokeObjectURL(item.url);
        });
        refreshChatsPage(root);
        requestAnimationFrame(() => {
          root.querySelector<HTMLInputElement>(".chat-compose__field")?.focus();
        });
      })
      .catch((error: unknown) => {
        console.error("[chats] source=api scope=send error", error);
        selectedThread.messages = (selectedThread.messages ?? []).map((m) =>
          m.id === optimisticMessage.id ? { ...m, deliveryState: "failed" as const } : m,
        );
        queueOutgoingForRetry(selectedThread.id, { ...optimisticMessage, deliveryState: "failed" });
        keepSelectedChatPinnedToBottom();
        updateThreadPreview(selectedThread);
        sortThreadsByUpdatedAt();
        persistChatsData(chatsState.threads);
        refreshChatsPage(root);
        if (isOfflineNetworkError(error)) {
          console.info("[chats] source=api scope=send deferred-offline", {
            chatId: selectedThread.id,
            localId: optimisticMessage.id,
          });
        }
        requestAnimationFrame(() => {
          root.querySelector<HTMLInputElement>(".chat-compose__field")?.focus();
        });
      });
  });
}
