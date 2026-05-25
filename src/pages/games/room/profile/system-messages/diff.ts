import type { GameRoom, GameRoomMessage } from "../../../../../api/games";
import { createRoomSystemMessage } from "../../../chat/model";
import { getSystemPlayerFullName } from "./names";
import {
  formatRoomModeLabel,
  getAssignedAdminVerb,
  getJoinedVerb,
  getLeftVerb,
  getReadyVerb,
  getRoomJoinLeavePlayerLabel,
} from "./verbs";

/**
 * Возвращает имя игрока по profileId из предыдущей или новой версии комнаты.
 */
function getSystemPlayerLabel(
  previousRoom: GameRoom,
  nextRoom: GameRoom,
  profileId: string,
): string {
  const player =
    nextRoom.players.find((item) => item.profileId === profileId) ??
    previousRoom.players.find((item) => item.profileId === profileId);
  return getSystemPlayerFullName(player) || "Игрок";
}

/**
 * Собирает сообщения по изменениям заголовка, администратора, пароля и режима комнаты.
 */
function pushRoomSettingsMessages(
  messages: string[],
  previousRoom: GameRoom,
  nextRoom: GameRoom,
): void {
  if (previousRoom.title !== nextRoom.title) {
    messages.push(`Комната переименована: "${nextRoom.title}".`);
  }

  if (
    previousRoom.createdByProfileId &&
    nextRoom.createdByProfileId &&
    previousRoom.createdByProfileId !== nextRoom.createdByProfileId
  ) {
    const previousAdmin =
      nextRoom.players.find((item) => item.profileId === previousRoom.createdByProfileId) ??
      previousRoom.players.find((item) => item.profileId === previousRoom.createdByProfileId);
    const previousAdminLabel = getSystemPlayerLabel(
      previousRoom,
      nextRoom,
      previousRoom.createdByProfileId,
    );
    const nextAdminLabel = getSystemPlayerLabel(
      previousRoom,
      nextRoom,
      nextRoom.createdByProfileId,
    );
    messages.push(
      `${previousAdminLabel} ${getAssignedAdminVerb(previousAdmin)} нового администратора: ${nextAdminLabel}.`,
    );
  }

  if (!previousRoom.hasPassword && nextRoom.hasPassword) {
    messages.push("Пароль комнаты установлен.");
  } else if (previousRoom.hasPassword && !nextRoom.hasPassword) {
    messages.push("Пароль комнаты удален.");
  } else if (
    previousRoom.hasPassword &&
    nextRoom.hasPassword &&
    previousRoom.password &&
    nextRoom.password &&
    previousRoom.password !== nextRoom.password
  ) {
    messages.push("Пароль комнаты изменен.");
  }

  if (previousRoom.isRanked !== nextRoom.isRanked) {
    messages.push(`Тип игры изменен: "${formatRoomModeLabel(nextRoom.isRanked)}".`);
  }
}

/**
 * Собирает сообщения входа и выхода игроков.
 */
function pushRoomRosterMessages(
  messages: string[],
  previousRoom: GameRoom,
  nextRoom: GameRoom,
  previousPlayersByProfile: Map<string, GameRoom["players"][number]>,
  nextPlayersByProfile: Map<string, GameRoom["players"][number]>,
  consumeDisconnectRemoval?: (roomId: string, profileId: string) => boolean,
): void {
  nextRoom.players.forEach((player) => {
    if (!player.profileId || previousPlayersByProfile.has(player.profileId)) return;
    messages.push(`${getRoomJoinLeavePlayerLabel(player)} ${getJoinedVerb(player)} к комнате.`);
  });

  previousRoom.players.forEach((player) => {
    if (!player.profileId || nextPlayersByProfile.has(player.profileId)) return;
    if (consumeDisconnectRemoval?.(nextRoom.id, player.profileId)) return;
    messages.push(`${getRoomJoinLeavePlayerLabel(player)} ${getLeftVerb(player)} из комнаты.`);
  });
}

/**
 * Собирает сообщения изменения готовности игроков в комнате ожидания.
 */
function pushRoomReadyMessages(
  messages: string[],
  previousRoom: GameRoom,
  nextRoom: GameRoom,
  roomRosterChanged: boolean,
): void {
  if (previousRoom.status !== "waiting" || nextRoom.status !== "waiting") return;

  const suppressForcedNotReady = previousRoom.isRanked !== nextRoom.isRanked || roomRosterChanged;
  const readyCount = nextRoom.players.filter((player) => player.isReady).length;
  const readyTotal = nextRoom.players.length;
  const previousReadyByProfile = new Map(
    previousRoom.players.map((player) => [player.profileId, player.isReady]),
  );
  nextRoom.players.forEach((player) => {
    const previousReady = previousReadyByProfile.get(player.profileId);
    if (previousReady === undefined || previousReady === player.isReady) return;
    if (suppressForcedNotReady && previousReady && !player.isReady) return;
    const playerLabel = getSystemPlayerLabel(previousRoom, nextRoom, player.profileId);
    const readySuffix = player.isReady ? ` (${readyCount}/${readyTotal})` : "";
    messages.push(
      `${playerLabel} ${getReadyVerb(player)} статус "${player.isReady ? "Готов" : "Не готов"}"${readySuffix}.`,
    );
  });
}

/**
 * Собирает системные сообщения по diff двух снимков комнаты.
 */
export function getRoomSystemMessages(
  previousRoom: GameRoom | null,
  nextRoom: GameRoom,
  options: { consumeDisconnectRemoval?: (roomId: string, profileId: string) => boolean } = {},
): GameRoomMessage[] {
  if (!previousRoom || previousRoom.id !== nextRoom.id) return [];

  const messages: string[] = [];

  pushRoomSettingsMessages(messages, previousRoom, nextRoom);

  const previousPlayersByProfile = new Map(
    previousRoom.players.map((player) => [player.profileId, player]),
  );
  const nextPlayersByProfile = new Map(
    nextRoom.players.map((player) => [player.profileId, player]),
  );
  const roomRosterChanged =
    previousRoom.players.length !== nextRoom.players.length ||
    previousRoom.players.some(
      (player) => player.profileId && !nextPlayersByProfile.has(player.profileId),
    ) ||
    nextRoom.players.some(
      (player) => player.profileId && !previousPlayersByProfile.has(player.profileId),
    );

  pushRoomRosterMessages(
    messages,
    previousRoom,
    nextRoom,
    previousPlayersByProfile,
    nextPlayersByProfile,
    options.consumeDisconnectRemoval,
  );
  pushRoomReadyMessages(messages, previousRoom, nextRoom, roomRosterChanged);

  if (previousRoom.status === "waiting" && nextRoom.status === "active") {
    messages.push("Игра начинается.");
  }

  return messages.map((message) => createRoomSystemMessage(nextRoom.id, message));
}
