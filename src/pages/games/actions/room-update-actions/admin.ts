import { assignRoomAdmin, kickRoomPlayer } from "../room-admin";
import type { RefreshCurrentRoomHandler, RoomUpdateActionsOptions } from "./types";

/**
 * Создаёт handlers администрирования игроков в комнате.
 */
export function createRoomAdminUpdateActions(
  options: RoomUpdateActionsOptions,
  refreshCurrentRoom: RefreshCurrentRoomHandler,
) {
  return {
    async handleKickPlayer(profileId: string): Promise<void> {
      await kickRoomPlayer({
        room: options.getRoom(),
        profileId,
        getCurrentRoom: options.getCurrentRoom,
        currentMessages: options.getCurrentMessages(),
        getSystemMessages: options.getSystemMessages,
        mergeMessages: options.mergeMessages,
        rememberRoomAccess: options.rememberRoomAccess,
        refreshCurrentRoom,
        setGamesState: options.setGamesState,
      });
    },

    async handleAssignAdmin(profileId: string): Promise<void> {
      await assignRoomAdmin({
        room: options.getRoom(),
        profileId,
        refreshCurrentRoom,
        setGamesState: options.setGamesState,
      });
    },
  };
}
