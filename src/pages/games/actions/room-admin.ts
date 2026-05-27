import {
  assignGameRoomAdmin,
  kickGameRoomPlayer,
  type GameRoom,
  type GameRoomMessage,
} from "../../../api/games";
import { createRoomSystemMessage } from "../chat/model";
import { getRemovedVerb, getRoomJoinLeavePlayerLabel } from "../room/profile/system-messages";
import { normalizeLobbyRoomUpdate } from "../room/state/lobby-updates";
import { gameT } from "../shared/i18n";
import { getInlineRoomLoadingPatch } from "../state/action-patches";
import { getRoomUpdatePatch } from "../state/room-update-patches";
import type { GamesPageState } from "../state/store";

type SetGamesState = (patch: Partial<GamesPageState>) => void;

export type KickRoomPlayerOptions = {
  room: GameRoom | null;
  profileId: string;
  getCurrentRoom: () => GameRoom | null;
  currentMessages: GameRoomMessage[];
  getSystemMessages: (previousRoom: GameRoom, nextRoom: GameRoom) => GameRoomMessage[];
  mergeMessages: (existing: GameRoomMessage[], incoming: GameRoomMessage[]) => GameRoomMessage[];
  rememberRoomAccess: (room: GameRoom) => void;
  refreshCurrentRoom: () => Promise<void>;
  setGamesState: SetGamesState;
};

export type AssignRoomAdminOptions = {
  room: GameRoom | null;
  profileId: string;
  refreshCurrentRoom: () => Promise<void>;
  setGamesState: SetGamesState;
};

/**
 * Собирает системное сообщение удаления игрока из комнаты.
 */
function getKickPlayerSystemMessages(
  room: GameRoom,
  nextRoom: GameRoom,
  profileId: string,
  getSystemMessages: (previousRoom: GameRoom, nextRoom: GameRoom) => GameRoomMessage[],
): GameRoomMessage[] {
  const removedPlayer = room.players.find((player) => player.profileId === profileId);
  if (!removedPlayer) return getSystemMessages(room, nextRoom);

  return [
    createRoomSystemMessage(
      room.id,
      gameT("system.removed", {
        player: getRoomJoinLeavePlayerLabel(removedPlayer),
        verb: getRemovedVerb(removedPlayer),
      }),
    ),
  ];
}

/**
 * Удаляет игрока из комнаты и обновляет локальный состав участников.
 */
export async function kickRoomPlayer(options: KickRoomPlayerOptions): Promise<void> {
  const { room, profileId, setGamesState } = options;
  if (!room || !profileId) return;

  setGamesState(getInlineRoomLoadingPatch());
  await kickGameRoomPlayer(room.id, profileId);
  if (options.getCurrentRoom()?.id !== room.id) return;

  const nextRoom = normalizeLobbyRoomUpdate(room, {
    ...room,
    players: room.players.filter((player) => player.profileId !== profileId),
  });
  const systemMessages = getKickPlayerSystemMessages(
    room,
    nextRoom,
    profileId,
    options.getSystemMessages,
  );

  options.rememberRoomAccess(nextRoom);
  setGamesState(
    getRoomUpdatePatch({
      room: nextRoom,
      currentMessages: options.currentMessages,
      systemMessages,
      mergeMessages: options.mergeMessages,
      patch: {
        kickConfirmProfileId: "",
        playerMenuProfileId: "",
        loading: false,
        errorTarget: "",
      },
    }),
  );
  void options.refreshCurrentRoom().catch(() => {
    setGamesState({ loading: false });
  });
}

/**
 * Назначает игрока администратором комнаты и refresh-ит комнату с сервера.
 */
export async function assignRoomAdmin(options: AssignRoomAdminOptions): Promise<void> {
  const { room, profileId, setGamesState } = options;
  if (!room || !profileId) return;

  setGamesState(getInlineRoomLoadingPatch());
  await assignGameRoomAdmin(room.id, profileId);
  setGamesState({
    adminConfirmProfileId: "",
    playerMenuProfileId: "",
    loading: false,
    errorTarget: "",
  });
  await options.refreshCurrentRoom();
}
