import type { GameRoom, GameRoomMessage } from "../../../api/games";
import type { GamesPageState } from "./store";

type GamesStatePatch = Partial<GamesPageState>;

export type RoomUpdatePatchOptions = {
  room: GameRoom;
  currentMessages: GameRoomMessage[];
  systemMessages: GameRoomMessage[];
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  patch?: GamesStatePatch;
};

/** Возвращает patch сообщений чата, если появились системные сообщения комнаты. */
export function getRoomSystemMessagesPatch(
  currentMessages: GameRoomMessage[],
  systemMessages: GameRoomMessage[],
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[],
): GamesStatePatch {
  if (!systemMessages.length) return {};
  return {
    roomChatMessages: mergeMessages(currentMessages, systemMessages),
  };
}

/** Возвращает state-patch обновления комнаты с опциональными системными сообщениями. */
export function getRoomUpdatePatch(options: RoomUpdatePatchOptions): GamesStatePatch {
  return {
    room: options.room,
    ...(options.patch ?? {}),
    ...getRoomSystemMessagesPatch(
      options.currentMessages,
      options.systemMessages,
      options.mergeMessages,
    ),
  };
}
