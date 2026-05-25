import type { GameRoom } from "../../../../api/games";
import { getGameRoom } from "../../../../api/games";
import { getRoomUpdatePatch } from "../../state/room-update-patches";
import type { GamesPageState } from "../../state/store";
import { normalizeLobbyRoomUpdate } from "../../room/state/lobby-updates";
import type { RoomReadinessActionOptions } from "./types";

/**
 * Загружает актуальную комнату и приводит её к lobby-формату.
 */
export async function fetchNormalizedRoomUpdate(
  previousRoom: GameRoom,
  options: RoomReadinessActionOptions,
): Promise<GameRoom | null> {
  const refreshedRoom = normalizeLobbyRoomUpdate(
    previousRoom,
    await options.hydrateRoom(await getGameRoom(previousRoom.id)),
  );
  if (options.getCurrentRoom()?.id !== previousRoom.id) return null;
  return refreshedRoom;
}

/**
 * Загружает актуальную комнату, гидратирует её и применяет общий patch обновления.
 */
export async function refreshAndCommitRoomUpdate(
  previousRoom: GameRoom,
  options: RoomReadinessActionOptions,
  patch: Partial<GamesPageState>,
): Promise<GameRoom | null> {
  const refreshedRoom = await fetchNormalizedRoomUpdate(previousRoom, options);
  if (!refreshedRoom) return null;

  const systemMessages = options.getSystemMessages(previousRoom, refreshedRoom);
  options.rememberRoomAccess(refreshedRoom);
  options.setGamesState(
    getRoomUpdatePatch({
      room: refreshedRoom,
      currentMessages: options.currentMessages,
      systemMessages,
      mergeMessages: options.mergeMessages,
      patch,
    }),
  );
  return refreshedRoom;
}
