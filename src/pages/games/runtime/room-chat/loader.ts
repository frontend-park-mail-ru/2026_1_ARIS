import type { GameRoomMessage } from "../../../../api/games";
import { ApiError } from "../../../../api/core/client";
import { gameT } from "../../shared/i18n";
import { isAbortError } from "./errors";
import type { CreateGamesRoomChatRuntimeOptions, LoadRoomChatMessagesOptions } from "./types";

type LoadRoomChatMessages = (
  roomId: string,
  loadOptions?: LoadRoomChatMessagesOptions,
) => Promise<void>;

/**
 * Загружает все страницы истории чата комнаты.
 */
async function fetchRoomChatHistory(
  options: CreateGamesRoomChatRuntimeOptions,
  roomId: string,
  loadOptions: LoadRoomChatMessagesOptions,
): Promise<GameRoomMessage[]> {
  const pageSize = 300;
  const messages: GameRoomMessage[] = [];
  let offset = 0;
  let page: GameRoomMessage[] = [];

  do {
    page = await options.fetchMessages(roomId, {
      limit: pageSize,
      offset,
      ...(loadOptions.signal ? { signal: loadOptions.signal } : {}),
    });
    messages.push(...page);
    offset += page.length;
  } while (page.length === pageSize);

  return messages;
}

/**
 * Объединяет историю чата с сохранёнными системными сообщениями и аватарами.
 */
async function applyLoadedRoomChatMessages(
  options: CreateGamesRoomChatRuntimeOptions,
  roomId: string,
  messages: GameRoomMessage[],
): Promise<void> {
  const room = options.getRoom();
  if (room?.id !== roomId) return;

  const restoredSystemMessages = options.getStoredSystemMessages(roomId);
  const incomingMessages = restoredSystemMessages.length
    ? options.mergeMessages(restoredSystemMessages, messages)
    : messages;
  const avatarLinks = await options.hydrateAuthorAvatars(room, incomingMessages);
  if (options.getRoom()?.id !== roomId) return;

  void options.prepareAvatarLinks(avatarLinks);
  options.setChatState({
    roomChatMessages: options.mergeMessages(options.getMessages(), incomingMessages),
    roomChatLoading: false,
    roomChatError: "",
  });
}

/**
 * Обрабатывает ошибку загрузки истории чата комнаты.
 */
function handleRoomChatLoadError(
  options: CreateGamesRoomChatRuntimeOptions,
  roomId: string,
  error: unknown,
  retryLoadMessages: LoadRoomChatMessages,
): void {
  if (isAbortError(error) || options.getRoom()?.id !== roomId) return;

  if (error instanceof ApiError && error.status === 403) {
    if (options.canRecoverAccess(roomId) && !options.getSocketOpen()) {
      void options.recoverAccess(roomId).then((room) => {
        if (!room || options.getRoom()?.id !== roomId) return;
        options.clearAccessRecovery(roomId);
        options.setRecoveredRoom(room);
        void retryLoadMessages(roomId, { silent: true });
      });
    } else {
      void options.handleUnavailable();
    }
    options.setChatState(
      {
        roomChatLoading: false,
        roomChatError: gameT("chat.loading"),
      },
      { scrollToBottom: false },
    );
    return;
  }

  options.setChatState(
    {
      roomChatLoading: false,
      roomChatError: options.formatError(error, gameT("chat.loadError")),
    },
    { scrollToBottom: false },
  );
}

/**
 * Загружает сообщения комнаты и синхронизирует состояние чата.
 */
export async function loadRoomChatMessages(
  options: CreateGamesRoomChatRuntimeOptions,
  roomId: string,
  loadOptions: LoadRoomChatMessagesOptions,
  retryLoadMessages: LoadRoomChatMessages,
): Promise<void> {
  if (!roomId) return;

  if (!loadOptions.silent) {
    options.setChatState({ roomChatLoading: true, roomChatError: "" }, { scrollToBottom: false });
  }

  try {
    const messages = await fetchRoomChatHistory(options, roomId, loadOptions);
    await applyLoadedRoomChatMessages(options, roomId, messages);
  } catch (error) {
    handleRoomChatLoadError(options, roomId, error, retryLoadMessages);
  }
}
