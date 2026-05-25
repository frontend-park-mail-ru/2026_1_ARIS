import type { GamesPageState } from "../state/store";

type RoomChatPatch = Pick<Partial<GamesPageState>, "roomChatDraft" | "roomChatShowSystemMessages">;

export type BindGamesLiveFieldEventsOptions = {
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  setRoomChatState: (
    patch: RoomChatPatch,
    options?: { scrollToBottom?: boolean; forceScrollToBottom?: boolean },
  ) => void;
  renderRoomsList: () => string;
};

/**
 * Обрабатывает ввод текста в чате комнаты.
 */
function handleRoomChatDraftInput(
  target: HTMLTextAreaElement,
  options: BindGamesLiveFieldEventsOptions,
): boolean {
  if (!target.matches("[data-games-room-chat-input]")) return false;
  options.patchGamesState({ roomChatDraft: target.value });
  return true;
}

/**
 * Обрабатывает поиск по списку комнат и обновляет только список.
 */
function handleRoomsSearchInput(
  root: Document | HTMLElement,
  target: HTMLInputElement,
  options: BindGamesLiveFieldEventsOptions,
): boolean {
  if (!target.matches("[data-games-rooms-search]")) return false;
  options.patchGamesState({ roomsSearchQuery: target.value });
  const list = root.querySelector<HTMLElement>("[data-games-room-list]");
  if (list) {
    list.innerHTML = options.renderRoomsList();
  }
  return true;
}

/**
 * Обрабатывает переключатель отображения системных сообщений чата.
 */
function handleRoomChatSystemToggle(
  target: HTMLInputElement,
  options: BindGamesLiveFieldEventsOptions,
): boolean {
  if (!target.matches("[data-games-room-chat-system-toggle]")) return false;
  options.setRoomChatState(
    { roomChatShowSystemMessages: target.checked },
    { scrollToBottom: true, forceScrollToBottom: true },
  );
  return true;
}

/**
 * Подключает live-поля, которые обновляют state без отправки формы.
 */
export function bindGamesLiveFieldEvents(
  root: Document | HTMLElement,
  options: BindGamesLiveFieldEventsOptions,
): void {
  root.addEventListener("input", (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement && handleRoomChatDraftInput(target, options)) return;
    if (target instanceof HTMLInputElement) {
      handleRoomsSearchInput(root, target, options);
    }
  });

  root.addEventListener("change", (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      handleRoomChatSystemToggle(target, options);
    }
  });
}
