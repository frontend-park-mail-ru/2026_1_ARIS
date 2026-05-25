/**
 * Action-фабрика восстановления доступа к комнате.
 *
 * Держит page-слой свободным от деталей sessionStorage/retry восстановления и
 * отдаёт готовый callback для socket/polling runtime.
 */
import type { GameRoom } from "../../../api/games";
import type { StoredGameRoomAccess } from "../room/access";
import { recoverStoredRoomAccess } from "../room/access-recovery";

export type RoomAccessRecoveryActionsOptions = {
  getStoredRoomAccess: (roomId: string) => StoredGameRoomAccess | null;
  joinRoom: (payload: {
    roomId?: string;
    inviteCode?: string;
    password?: string;
  }) => Promise<GameRoom>;
  canRecoverRoomAccess: (roomId: string) => boolean;
  hydrateRoomAvatars: (room: GameRoom, signal?: AbortSignal) => Promise<GameRoom>;
  rememberRoomAccess: (room: GameRoom) => void;
};

/**
 * Создаёт actions восстановления сохранённого доступа к комнате.
 */
export function createRoomAccessRecoveryActions(options: RoomAccessRecoveryActionsOptions) {
  /**
   * Восстанавливает доступ к комнате через сохранённый roomId/invite-код.
   */
  function recoverRoomAccess(roomId: string, signal?: AbortSignal): Promise<GameRoom | null> {
    return recoverStoredRoomAccess(roomId, signal, {
      getStoredRoomAccess: options.getStoredRoomAccess,
      joinRoom: options.joinRoom,
      canRecoverRoomAccess: options.canRecoverRoomAccess,
      hydrateRoomAvatars: options.hydrateRoomAvatars,
      rememberRoomAccess: options.rememberRoomAccess,
    });
  }

  return {
    recoverRoomAccess,
  };
}
