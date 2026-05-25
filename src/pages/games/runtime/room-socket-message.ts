import type { GameRoom, GameRoomMessage } from "../../../api/games";
import type { GamesPageState } from "../state/store";

type RoomChatStatePatch = Pick<Partial<GamesPageState>, "roomChatMessages" | "roomChatError">;

type RoomChatStateOptions = {
  scrollToBottom?: boolean;
  forceScrollToBottom?: boolean;
};

export type HandleRoomSocketMessageOptions = {
  getRoom: () => GameRoom | null;
  getMessages: () => GameRoomMessage[];
  rememberDisconnectRemoval: (message: GameRoomMessage) => void;
  getAuthorAvatar: (room: GameRoom | null, message: GameRoomMessage) => string;
  hydrateAuthorAvatars: (room: GameRoom | null, messages: GameRoomMessage[]) => Promise<string[]>;
  prepareAvatarLinks: (avatarLinks: string[]) => void | Promise<void>;
  refreshChat: (options: RoomChatStateOptions) => void;
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  setChatState: (patch: RoomChatStatePatch, options: RoomChatStateOptions) => void;
};

/** Обрабатывает входящее socket-сообщение чата активной комнаты. */
export function handleRoomSocketMessage(
  message: GameRoomMessage,
  options: HandleRoomSocketMessageOptions,
): void {
  const currentRoomId = options.getRoom()?.id ?? "";
  if (!currentRoomId || (message.roomId && message.roomId !== currentRoomId)) return;
  const roomMessage = message.roomId ? message : { ...message, roomId: currentRoomId };

  options.rememberDisconnectRemoval(roomMessage);
  void options.prepareAvatarLinks([options.getAuthorAvatar(options.getRoom(), roomMessage)]);
  void options.hydrateAuthorAvatars(options.getRoom(), [roomMessage]).then((avatarLinks) => {
    if (!avatarLinks.length || options.getRoom()?.id !== currentRoomId) return;
    void options.prepareAvatarLinks(avatarLinks);
    options.refreshChat({ scrollToBottom: true, forceScrollToBottom: true });
  });
  options.setChatState(
    {
      roomChatMessages: options.mergeMessages(options.getMessages(), [roomMessage]),
      roomChatError: "",
    },
    { scrollToBottom: true, forceScrollToBottom: true },
  );
}
