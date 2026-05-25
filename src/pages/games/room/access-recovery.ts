import type { GameRoom } from "../../../api/games";
import type { StoredGameRoomAccess } from "./access";

export type RoomAccessRecoveryOptions = {
  getStoredRoomAccess: (roomId: string) => StoredGameRoomAccess | null;
  joinRoom: (payload: {
    roomId?: string;
    inviteCode?: string;
    password?: string;
  }) => Promise<GameRoom>;
  canRecoverRoomAccess: (roomId: string) => boolean;
  hydrateRoomAvatars: (room: GameRoom, signal?: AbortSignal) => Promise<GameRoom>;
  rememberRoomAccess: (room: GameRoom) => void;
  retryDelays?: number[];
};

const defaultRoomAccessRetryDelays = [0, 350, 800, 1500, 2500, 4000];

/**
 * Повторно входит в комнату по сохранённому roomId или invite-коду.
 */
export async function restoreRoomAccess(
  roomId: string,
  options: Pick<RoomAccessRecoveryOptions, "getStoredRoomAccess" | "joinRoom">,
): Promise<GameRoom | null> {
  const access = options.getStoredRoomAccess(roomId);
  if (!access) return null;
  try {
    return await options.joinRoom(
      access.inviteCode
        ? {
            inviteCode: access.inviteCode,
            ...(access.password ? { password: access.password } : {}),
          }
        : { roomId, ...(access.password ? { password: access.password } : {}) },
    );
  } catch {
    return null;
  }
}

/**
 * Ждёт перед повторной попыткой восстановления доступа к комнате.
 */
export function waitForRoomAccessRetry(ms: number, signal?: AbortSignal): Promise<void> {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeoutId);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Восстанавливает доступ к комнате с короткой серией повторов.
 */
export async function recoverStoredRoomAccess(
  roomId: string,
  signal: AbortSignal | undefined,
  options: RoomAccessRecoveryOptions,
): Promise<GameRoom | null> {
  const retryDelays = options.retryDelays ?? defaultRoomAccessRetryDelays;

  for (const delayMs of retryDelays) {
    if (!options.canRecoverRoomAccess(roomId) || signal?.aborted) return null;
    await waitForRoomAccessRetry(delayMs, signal);
    if (!options.canRecoverRoomAccess(roomId) || signal?.aborted) return null;

    const restoredRoom = await restoreRoomAccess(roomId, options);
    if (!restoredRoom) continue;

    const hydratedRoom = await options.hydrateRoomAvatars(restoredRoom, signal);
    options.rememberRoomAccess(hydratedRoom);
    return hydratedRoom;
  }

  return null;
}
