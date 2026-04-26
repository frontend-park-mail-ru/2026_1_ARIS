import { sendChatMessage } from "../../api/chat";
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
  formatMessageTime,
  isOfflineNetworkError,
  getCurrentUserProfilePath,
  syncSelectedChatToUrl,
} from "./helpers";
import { sortThreadsByUpdatedAt, updateThreadPreview } from "./threads";

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
    }
  });

  root.addEventListener("click", (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

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

    const chatButton = target.closest("[data-chat-select]");
    if (chatButton instanceof HTMLButtonElement) {
      const chatId = chatButton.getAttribute("data-chat-select");
      if (!chatId || chatId === chatsState.selectedChatId) return;

      chatsState.selectedChatId = chatId;
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
    if (!(target instanceof HTMLFormElement) || !target.matches("[data-chat-compose-form]")) return;

    event.preventDefault();

    const selectedThread = chatsState.threads.find((t) => t.id === chatsState.selectedChatId);
    if (!selectedThread) return;

    const formData = new FormData(target);
    const text = String(formData.get("message") ?? "").trim();
    if (!text) return;

    chatsState.actionErrorMessage = "";

    const currentUser = getSessionUser();
    const optimisticMessage = {
      id: `local-${Date.now()}`,
      text,
      authorName: `${currentUser?.firstName ?? "Вы"} ${currentUser?.lastName ?? ""}`.trim(),
      isOwn: true,
      deliveryState: "sending" as const,
      createdAt: new Date().toISOString(),
      avatarLink: currentUser?.avatarLink,
      profilePath: getCurrentUserProfilePath(),
    };

    if (!selectedThread.messages) selectedThread.messages = [];
    selectedThread.messages = sortMessagesByCreatedAt([
      ...selectedThread.messages,
      optimisticMessage,
    ]);
    addPendingOutgoing(selectedThread.id, optimisticMessage);
    selectedThread.preview = text;
    selectedThread.previewIsOwn = true;
    selectedThread.timeLabel = formatMessageTime(optimisticMessage.createdAt);
    selectedThread.updatedAt = optimisticMessage.createdAt;
    sortThreadsByUpdatedAt();
    clearUnreadIncoming(selectedThread.id);
    keepSelectedChatPinnedToBottom();
    queueOutgoingForRetry(selectedThread.id, optimisticMessage);
    persistChatsData(chatsState.threads);
    chatsState.composeDraftByChatId.set(selectedThread.id, "");
    target.reset();
    refreshChatsPage(root);
    requestAnimationFrame(() => {
      root.querySelector<HTMLInputElement>(".chat-compose__field")?.focus();
    });

    if (selectedThread.source !== "api") return;

    void sendChatMessage(selectedThread.id, { text })
      .then((message) => {
        console.info("[chats] source=api scope=send", {
          chatId: selectedThread.id,
          messageId: message.id,
        });

        selectedThread.messages = sortMessagesByCreatedAt(
          dedupeMessagesById(
            (selectedThread.messages ?? []).map((m) =>
              m.id === optimisticMessage.id
                ? {
                    ...m,
                    id: message.id,
                    deliveryState: undefined,
                    createdAt: message.createdAt,
                    profilePath: getCurrentUserProfilePath(),
                  }
                : m,
            ),
          ),
        );
        removePendingOutgoing(selectedThread.id, optimisticMessage.id);
        updateThreadPreview(selectedThread);
        sortThreadsByUpdatedAt();
        persistChatsData(chatsState.threads);
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
