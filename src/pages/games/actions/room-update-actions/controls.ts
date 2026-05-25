import { forceResumeCurrentRoom, pauseCurrentRoom, startCurrentRoom } from "../room-controls";
import type { RoomUpdateActionsOptions } from "./types";

/**
 * Создаёт handlers управления ходом текущей комнаты.
 */
export function createRoomControlUpdateActions(options: RoomUpdateActionsOptions) {
  return {
    async handlePauseRoom(): Promise<void> {
      await pauseCurrentRoom({
        room: options.getRoom(),
        setGamesState: options.setGamesState,
      });
    },

    async handleForceResumeRoom(): Promise<void> {
      await forceResumeCurrentRoom({
        room: options.getRoom(),
        setGamesState: options.setGamesState,
      });
    },

    async handleStartRoom(): Promise<void> {
      await startCurrentRoom({
        room: options.getRoom(),
        currentMessages: options.getCurrentMessages(),
        getSystemMessages: options.getSystemMessages,
        mergeMessages: options.mergeMessages,
        setGamesState: options.setGamesState,
      });
    },
  };
}
