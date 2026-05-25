import { toggleRoomRanked, toggleRoomReady, toggleRoomReplay } from "../room-readiness";
import type { RoomUpdateActionsOptions } from "./types";

/**
 * Собирает общий набор зависимостей для действий готовности комнаты.
 */
function getRoomReadinessOptions(options: RoomUpdateActionsOptions) {
  return {
    room: options.getRoom(),
    getCurrentRoom: options.getCurrentRoom,
    currentProfileId: options.getCurrentProfileId(),
    currentMessages: options.getCurrentMessages(),
    hydrateRoom: options.hydrateRoom,
    getSystemMessages: options.getSystemMessages,
    mergeMessages: options.mergeMessages,
    rememberRoomAccess: options.rememberRoomAccess,
    setGamesState: options.setGamesState,
  };
}

/**
 * Создаёт handlers готовности, replay и рейтингового режима комнаты.
 */
export function createRoomReadinessUpdateActions(options: RoomUpdateActionsOptions) {
  return {
    async handleReadyToggle(isReady: boolean): Promise<void> {
      await toggleRoomReady(isReady, getRoomReadinessOptions(options));
    },

    async handleReplayToggle(isReady: boolean): Promise<void> {
      await toggleRoomReplay(isReady, getRoomReadinessOptions(options));
    },

    async handleRoomRankedToggle(isRanked: boolean): Promise<void> {
      await toggleRoomRanked(isRanked, {
        ...getRoomReadinessOptions(options),
        setPendingRankedToast: options.setPendingRankedToast,
        showToast: options.showToast,
        getRankedToastMessage: options.getRankedToastMessage,
      });
    },
  };
}
