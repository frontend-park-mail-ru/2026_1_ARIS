import { refreshCurrentRoomAction } from "../room-live";
import type { RoomUpdateActionsOptions } from "./types";

/**
 * Обновляет текущую комнату с сервера.
 */
export async function refreshCurrentRoom(options: RoomUpdateActionsOptions): Promise<void> {
  await refreshCurrentRoomAction({
    getCurrentRoom: options.getCurrentRoom,
    getCurrentMessages: options.getCurrentMessages,
    fetchRoom: options.fetchRoom,
    hydrateRoom: options.hydrateRoom,
    getSystemMessages: options.getSystemMessages,
    mergeMessages: options.mergeMessages,
    rememberRoomAccess: options.rememberRoomAccess,
    setGamesState: options.setGamesState,
  });
}
