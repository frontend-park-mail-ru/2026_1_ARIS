import { createRoomAdminUpdateActions } from "./room-update-actions/admin";
import { createRoomControlUpdateActions } from "./room-update-actions/controls";
import { createRoomReadinessUpdateActions } from "./room-update-actions/readiness";
import { refreshCurrentRoom as refreshCurrentRoomAction } from "./room-update-actions/refresh";
import type { RoomUpdateActionsOptions } from "./room-update-actions/types";

export type { RoomUpdateActionsOptions } from "./room-update-actions/types";

/**
 * Создаёт фасад действий, которые обновляют текущую комнату и её сообщения.
 */
export function createRoomUpdateActions(options: RoomUpdateActionsOptions) {
  /**
   * Обновляет текущую комнату с сервера.
   */
  async function refreshCurrentRoom(): Promise<void> {
    await refreshCurrentRoomAction(options);
  }

  return {
    refreshCurrentRoom,
    ...createRoomReadinessUpdateActions(options),
    ...createRoomControlUpdateActions(options),
    ...createRoomAdminUpdateActions(options, refreshCurrentRoom),
  };
}
