import { ApiError } from "../../../api/core/client";
import type { GameRoom } from "../../../api/games";
import type { PublicGameGuestSession } from "../../../api/games";
import { restoreRoomAccess } from "../room/access-recovery";
import type { StoredGameRoomAccess } from "../room/access";
import {
  getErrorMessage,
  isAbortError,
  isJoinRoomAlreadyStartedError,
  isJoinRoomFullError,
  isJoinRoomPasswordError,
} from "../shared/errors";
import { gameT } from "../shared/i18n";
import { createInitialGamesState, type GamesPageState } from "../state/store";

export type LoadInitialGamesStateOptions = {
  getRoom: (roomId: string, signal?: AbortSignal) => Promise<GameRoom>;
  joinRoom: (payload: {
    roomId?: string;
    inviteCode?: string;
    password?: string;
  }) => Promise<GameRoom>;
  hydrateRoom: (room: GameRoom, signal?: AbortSignal) => Promise<GameRoom>;
  getStoredRoomSnapshot: (roomId: string) => GameRoom | null;
  getStoredRoomAccess: (roomId: string) => StoredGameRoomAccess | null;
  allowRoomAccessRecovery: (roomId: string) => void;
  rememberRoomTitle: (roomId: string, title: string) => void;
  rememberRoomAccess: (room: GameRoom) => void;
  canRecoverRoomAccess: (roomId: string) => boolean;
  recoverRoomAccess: (roomId: string, signal?: AbortSignal) => Promise<GameRoom | null>;
  replaceWithGamesMenuRoute: () => void;
};

export type LoadInitialPublicGamesStateOptions = {
  hasSessionUser: () => boolean;
  joinRoom: (payload: { inviteCode?: string }) => Promise<GameRoom>;
  getStoredPublicGuestSession: (inviteCode: string) => PublicGameGuestSession | null;
  forgetPublicGuestSession: (session: PublicGameGuestSession) => void;
  getPublicRoom: (roomId: string, token: string, signal?: AbortSignal) => Promise<GameRoom>;
  hydrateRoom: (room: GameRoom, signal?: AbortSignal) => Promise<GameRoom>;
  rememberRoomAccess: (room: GameRoom) => void;
};

/**
 * Загружает начальное состояние страницы игры для прямого входа в комнату.
 */
export async function loadInitialGamesState(
  roomId: string,
  signal: AbortSignal | undefined,
  options: LoadInitialGamesStateOptions,
): Promise<GamesPageState> {
  const state = createInitialGamesState();
  state.roomId = roomId;

  if (!roomId) {
    return state;
  }

  const roomSnapshot = options.getStoredRoomSnapshot(roomId);
  let triedStoredRoomRestore = false;
  if (roomSnapshot) {
    triedStoredRoomRestore = true;
    options.allowRoomAccessRecovery(roomSnapshot.id);
    options.rememberRoomTitle(roomSnapshot.id, roomSnapshot.title);
    const restoredRoom = await restoreRoomAccess(roomId, {
      getStoredRoomAccess: options.getStoredRoomAccess,
      joinRoom: options.joinRoom,
    });
    if (restoredRoom) {
      state.room = await options.hydrateRoom(restoredRoom, signal);
      options.rememberRoomAccess(state.room);
      return state;
    }
  }

  try {
    state.room = await options.hydrateRoom(await options.getRoom(roomId, signal), signal);
    options.rememberRoomAccess(state.room);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    if (
      error instanceof ApiError &&
      error.status === 403 &&
      options.canRecoverRoomAccess(roomId) &&
      !triedStoredRoomRestore
    ) {
      const recoveredRoom = await options.recoverRoomAccess(roomId, signal);
      if (recoveredRoom) {
        state.room = recoveredRoom;
        return state;
      }
    }
    if (error instanceof ApiError && error.status === 403) {
      return loadInitialStateThroughJoin(roomId, signal, state, options);
    }
    state.error = getErrorMessage(error, gameT("room.loadError"));
  }

  return state;
}

/**
 * Загружает начальное состояние публичной презентационной комнаты.
 */
export async function loadInitialPublicGamesState(
  inviteCode: string,
  signal: AbortSignal | undefined,
  options: LoadInitialPublicGamesStateOptions,
): Promise<GamesPageState> {
  const state = createInitialGamesState();
  state.publicInviteCode = inviteCode;

  if (!inviteCode) {
    return state;
  }

  if (options.hasSessionUser()) {
    try {
      const session = options.getStoredPublicGuestSession(inviteCode);
      state.room = await options.hydrateRoom(await options.joinRoom({ inviteCode }), signal);
      state.roomId = state.room.id;
      options.rememberRoomAccess(state.room);
      if (session) {
        options.forgetPublicGuestSession(session);
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      state.error = getErrorMessage(error, gameT("room.loadError"));
    }
    return state;
  }

  const session = options.getStoredPublicGuestSession(inviteCode);
  if (!session) {
    return state;
  }

  try {
    state.room = await options.hydrateRoom(
      await options.getPublicRoom(session.roomId, session.token, signal),
      signal,
    );
    state.roomId = state.room.id;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    options.forgetPublicGuestSession(session);
    state.error = getErrorMessage(error, gameT("room.loadError"));
  }

  return state;
}

/**
 * Обрабатывает fallback-вход в комнату после 403 при прямой загрузке.
 */
async function loadInitialStateThroughJoin(
  roomId: string,
  signal: AbortSignal | undefined,
  state: GamesPageState,
  options: LoadInitialGamesStateOptions,
): Promise<GamesPageState> {
  try {
    const joinedRoom = await options.hydrateRoom(await options.joinRoom({ roomId }), signal);
    state.room = joinedRoom;
    state.roomId = joinedRoom.id;
    options.rememberRoomAccess(joinedRoom);
    return state;
  } catch (joinError) {
    if (isJoinRoomAlreadyStartedError(joinError)) {
      options.replaceWithGamesMenuRoute();
      state.roomId = "";
      return state;
    }
    if (isJoinRoomFullError(joinError)) {
      options.replaceWithGamesMenuRoute();
      state.roomId = "";
      state.message = gameT("room.full");
      return state;
    }
    if (isJoinRoomPasswordError(joinError)) {
      state.joinPasswordRoomId = roomId;
      state.error = "";
      state.errorTarget = "";
      return state;
    }
    state.error = getErrorMessage(joinError, gameT("room.loadError"));
  }
  return state;
}
