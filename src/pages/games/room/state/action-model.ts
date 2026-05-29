import type { CreateGameRoomPayload, GameRoom, JoinGameRoomPayload } from "../../../../api/games";
import { parseBoundedInt } from "../../shared/forms";
import { resetRoomReadyState } from "./lobby-updates";

export type CreateRoomFormValues = {
  title: string;
  maxPlayers: string;
  questionCount: string;
  answerTimeoutSec: string;
  roundPauseSec: string;
  password: string;
  isRanked: boolean;
};

export type CreateRoomCommand = {
  payload: CreateGameRoomPayload;
  title: string;
  password: string;
};

export type JoinListedRoomValues = {
  roomId: string;
  inviteCode: string;
  password: string;
};

/** Собирает payload создания комнаты с учётом ranked-ограничений. */
export function buildCreateRoomCommand(values: CreateRoomFormValues): CreateRoomCommand {
  const questionCount = parseBoundedInt(values.questionCount, 5, 1, 20);
  const answerTimeoutSec = parseBoundedInt(values.answerTimeoutSec, 10, 0, 300);
  const roundPauseSec = parseBoundedInt(values.roundPauseSec, 5, 1, 60);
  const normalizedQuestionCount = values.isRanked ? 10 : questionCount;
  const normalizedAnswerTimeoutSec = values.isRanked ? 10 : answerTimeoutSec;
  const normalizedRoundPauseSec = values.isRanked ? 5 : roundPauseSec;
  const payload: CreateGameRoomPayload = {
    title: values.title,
    maxPlayers: parseBoundedInt(values.maxPlayers, 2, 2, 8),
    questionCount: normalizedQuestionCount,
    answerTimeoutSec: normalizedAnswerTimeoutSec,
    roundPauseSec: normalizedRoundPauseSec,
    gameType: "number_duel",
    isRanked: values.isRanked,
    inviteCodeEnabled: true,
    ...(values.password ? { password: values.password } : {}),
  };

  return {
    payload,
    title: values.title,
    password: values.password,
  };
}

/** Собирает payload входа в комнату по invite-коду. */
export function buildJoinByCodePayload(
  inviteCode: string,
  password: string,
): JoinGameRoomPayload | null {
  const normalizedInviteCode = inviteCode.trim().toUpperCase();
  if (!normalizedInviteCode) return null;
  return {
    inviteCode: normalizedInviteCode,
    ...(password ? { password } : {}),
  };
}

/** Собирает payload входа в комнату из списка комнат или по invite-коду. */
export function buildJoinListedRoomPayload(
  values: JoinListedRoomValues,
): JoinGameRoomPayload | null {
  const roomId = values.roomId.trim();
  const inviteCode = values.inviteCode.trim().toUpperCase();
  if (!roomId && !inviteCode) return null;
  return {
    ...(roomId ? { roomId } : {}),
    ...(inviteCode ? { inviteCode } : {}),
    ...(values.password ? { password: values.password } : {}),
  };
}

/** Парсит числовой ответ игрока с поддержкой запятой как десятичного разделителя. */
export function parseGameAnswer(value: string): number | null {
  const normalized = value.replace(",", ".");
  const answer = Number(normalized);
  return Number.isFinite(answer) ? answer : null;
}

/** Возвращает комнату с оптимистично обновлённой готовностью текущего игрока. */
export function getOptimisticReadyRoom(
  room: GameRoom,
  currentProfileId: string,
  isReady: boolean,
): GameRoom {
  return {
    ...room,
    players: room.players.map((player) =>
      player.profileId === currentProfileId || player.isMe ? { ...player, isReady } : player,
    ),
  };
}

/** Возвращает комнату с оптимистично изменённым ranked-режимом и сброшенной готовностью. */
export function getOptimisticRankedRoom(room: GameRoom, isRanked: boolean): GameRoom {
  return resetRoomReadyState({ ...room, isRanked });
}
