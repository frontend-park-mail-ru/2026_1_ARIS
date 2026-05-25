import { loadRoomChatMessages } from "./room-chat/loader";
import type {
  CreateGamesRoomChatRuntimeOptions,
  GamesRoomChatRuntime,
  LoadRoomChatMessagesOptions,
} from "./room-chat/types";

export type {
  CreateGamesRoomChatRuntimeOptions,
  GamesRoomChatRuntime,
  LoadRoomChatMessagesOptions,
  RoomChatStateOptions,
  RoomChatStatePatch,
} from "./room-chat/types";

/** Создаёт runtime для загрузки и polling-обновления чата игровой комнаты. */
export function createGamesRoomChatRuntime(
  options: CreateGamesRoomChatRuntimeOptions,
): GamesRoomChatRuntime {
  let refreshTimerId: number | null = null;
  let loadedRoomId = "";
  let abortController: AbortController | null = null;

  const stopRefresh = () => {
    if (refreshTimerId === null) return;
    window.clearInterval(refreshTimerId);
    refreshTimerId = null;
  };

  const abortLoad = () => {
    abortController?.abort();
    abortController = null;
  };

  const reset = () => {
    abortLoad();
    stopRefresh();
    loadedRoomId = "";
    options.setChatState({
      roomChatMessages: [],
      roomChatLoading: false,
      roomChatSending: false,
      roomChatError: "",
      roomChatDraft: "",
    });
  };

  const loadMessages = async (
    roomId: string,
    loadOptions: LoadRoomChatMessagesOptions = {},
  ): Promise<void> => {
    await loadRoomChatMessages(options, roomId, loadOptions, loadMessages);
  };

  const sync = () => {
    const roomId = options.getRoom()?.id ?? "";

    if (!roomId) {
      reset();
      return;
    }

    if (loadedRoomId !== roomId) {
      abortLoad();
      stopRefresh();
      loadedRoomId = roomId;
      abortController = new AbortController();
      void loadMessages(roomId, { signal: abortController.signal });
    }

    if (refreshTimerId === null) {
      refreshTimerId = window.setInterval(() => {
        const currentRoomId = options.getRoom()?.id ?? "";
        if (!currentRoomId || options.getLoading()) return;
        void loadMessages(currentRoomId, { silent: true });
      }, 8000);
    }
  };

  return {
    loadMessages,
    sync,
    stop() {
      abortLoad();
      stopRefresh();
      loadedRoomId = "";
    },
    reset,
  };
}
