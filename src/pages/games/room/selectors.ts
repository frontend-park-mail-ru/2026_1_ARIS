import type { GameRoom } from "../../../api/games";
import { getCompletedQuestions } from "../round/model";

const roomMaxPlayers = 8;
const publicLobbyMaxPlayers = 80;

/** Возвращает оппонента текущего профиля в комнате. */
export function getOpponent(room: GameRoom | null, currentProfileId: string) {
  return room?.players.find((player) => player.profileId !== currentProfileId) ?? null;
}

/** Возвращает текущего игрока комнаты по флагу isMe или profileId. */
export function getCurrentPlayer(room: GameRoom | null, currentProfileId: string) {
  return (
    (currentProfileId
      ? room?.players.find((player) => player.profileId === currentProfileId)
      : null) ??
    room?.players.find((player) => player.isMe) ??
    null
  );
}

/** Проверяет, является ли текущий игрок создателем комнаты. */
export function isCurrentRoomCreator(room: GameRoom, currentProfileId: string): boolean {
  if (currentProfileId && room.createdByProfileId === currentProfileId) {
    return true;
  }
  const currentPlayer = getCurrentPlayer(room, currentProfileId);
  return Boolean(currentPlayer?.profileId && currentPlayer.profileId === room.createdByProfileId);
}

/** Возвращает нормализованный лимит игроков комнаты. */
export function getRoomMaxPlayers(room: GameRoom): number {
  const maxPlayers = room.isPublicLobby ? publicLobbyMaxPlayers : roomMaxPlayers;
  return Math.min(maxPlayers, Math.max(2, room.maxPlayers || 2));
}

/** Проверяет, заполнена ли комната по лимиту игроков. */
export function isRoomFull(room: GameRoom): boolean {
  return room.players.length >= getRoomMaxPlayers(room);
}

/** Проверяет, находится ли текущий пользователь в комнате из списка. */
export function isCurrentPlayerInListedRoom(room: GameRoom, currentProfileId: string): boolean {
  return room.players.some(
    (player) => player.isMe || (currentProfileId && player.profileId === currentProfileId),
  );
}

/** Проверяет, нужно ли заблокировать вход в заполненную комнату. */
export function shouldBlockFullRoomJoin(room: GameRoom, currentProfileId: string): boolean {
  return isRoomFull(room) && !isCurrentPlayerInListedRoom(room, currentProfileId);
}

/** Возвращает автора комнаты из creator, списка игроков или первого участника. */
export function getRoomAuthor(room: GameRoom) {
  return (
    room.creator ??
    room.players.find((player) => player.profileId === room.createdByProfileId) ??
    room.players[0] ??
    null
  );
}

/** Проверяет готовность всех игроков комнаты. */
export function areRoomPlayersReady(room: GameRoom): boolean {
  return room.players.every((player) => player.isReady);
}

/** Возвращает текущего игрока комнаты только по серверному флагу isMe. */
export function getCurrentRoomPlayer(room: GameRoom): GameRoom["players"][number] | null {
  return room.players.find((player) => player.isMe) ?? null;
}

/** Проверяет, стоит ли игра на паузе. */
export function isRoomPaused(room: GameRoom): boolean {
  return Boolean(room.pausedByProfileId && room.pauseUntilAt);
}

/** Возвращает игрока, который поставил комнату на паузу. */
export function getPausedByPlayer(room: GameRoom): GameRoom["players"][number] | null {
  return room.players.find((player) => player.profileId === room.pausedByProfileId) ?? null;
}

/** Проверяет, может ли текущий игрок поставить комнату на паузу. */
export function canCurrentPlayerPause(room: GameRoom): boolean {
  const player = getCurrentRoomPlayer(room);
  return (
    room.status === "active" &&
    !room.isPublicLobby &&
    !isRoomPaused(room) &&
    Boolean(player && !player.pauseUsed)
  );
}

/** Проверяет, может ли текущий игрок проголосовать за продолжение. */
export function canCurrentPlayerForceResume(room: GameRoom): boolean {
  const player = getCurrentRoomPlayer(room);
  return Boolean(
    player &&
    isRoomPaused(room) &&
    player.profileId !== room.pausedByProfileId &&
    !player.forceResumeRequested,
  );
}

/** Проверяет, находится ли комната в countdown перед первым вопросом. */
export function isRoomInStartCountdown(room: GameRoom): boolean {
  return (
    room.status === "active" &&
    Boolean(room.nextQuestionAt) &&
    !room.currentQuestion &&
    getCompletedQuestions(room).length === 0
  );
}
