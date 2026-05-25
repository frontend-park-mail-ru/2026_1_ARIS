import type { GamesDomRefreshOptions } from "./types";

/**
 * Обновляет DOM чата комнаты.
 */
export function refreshRoomChatDom(
  options: GamesDomRefreshOptions,
  params: { scrollToBottom?: boolean; forceScrollToBottom?: boolean } = {},
): void {
  const { root, room } = options;
  if (!root || !room) return;
  const externalChat = root.querySelector<HTMLElement>("[data-games-external-chat]");
  if (!externalChat) return;

  externalChat.innerHTML = options.renderRoomChat(room);
  if (params.scrollToBottom ?? true) {
    options.scrollRoomChatToBottom(externalChat, {
      ensureAfterRender: Boolean(params.forceScrollToBottom),
    });
  }
}
