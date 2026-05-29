import type { GameRoom } from "../../../../api/games";
import { areRoundAnswersTied, getQuestionAnswer, isMissingRoundAnswer } from "./answers";
import { getRoundPlayerLabel } from "./players";
import { getRoundResultEntries } from "./results";
import { getCompletedQuestions } from "./questions";
import type { GamePlayer, GameQuestion } from "./types";

type PlayerRankOptions = {
  excludeQuestionId?: string;
};

/** Считает очки игроков за конкретный вопрос. */
export function getRoundPointsByProfile(
  room: GameRoom,
  question: GameQuestion,
): Map<string, number> {
  const entries = getRoundResultEntries(room, question);
  const playerCount = entries.length;
  const result = new Map<string, number>();
  entries.forEach((entry) => {
    if (isMissingRoundAnswer(entry.answer)) {
      result.set(entry.player.profileId, 0);
    }
  });
  for (let index = 0; index < entries.length; ) {
    if (isMissingRoundAnswer(entries[index]?.answer)) {
      index++;
      continue;
    }
    let end = index + 1;
    while (
      end < entries.length &&
      Boolean(entries[index]) &&
      Boolean(entries[end]) &&
      !isMissingRoundAnswer(entries[end]!.answer) &&
      areRoundAnswersTied(entries[index]!.answer, entries[end]!.answer)
    ) {
      end++;
    }
    let sum = 0;
    for (let position = index; position < end; position++) {
      sum += Math.max(playerCount - position - 1, 0);
    }
    const average = Math.round((sum / (end - index)) * 100) / 100;
    for (let position = index; position < end; position++) {
      const entry = entries[position];
      if (entry) {
        result.set(entry.player.profileId, average);
      }
    }
    index = end;
  }
  return result;
}

/** Считает суммарные очки игроков по завершённым вопросам. */
export function getComputedScoresByProfile(room: GameRoom): Map<string, number> {
  const scores = new Map(room.players.map((player) => [player.profileId, 0]));

  getCompletedQuestions(room).forEach((question) => {
    const roundPoints = getRoundPointsByProfile(room, question);
    roundPoints.forEach((points, profileId) => {
      scores.set(profileId, (scores.get(profileId) ?? 0) + points);
    });
  });

  return scores;
}

/** Возвращает счёт игроков до начисления очков выбранного вопроса. */
export function getPreviousRoundScoresByProfile(
  room: GameRoom,
  question: GameQuestion,
): Map<string, number> {
  const scores = new Map(getComputedScoresByProfile(room));
  const roundPoints = getRoundPointsByProfile(room, question);
  roundPoints.forEach((points, profileId) => {
    scores.set(profileId, Math.max(0, (scores.get(profileId) ?? 0) - points));
  });
  return scores;
}

/** Возвращает вычисленный счёт одного игрока. */
export function getComputedPlayerScore(room: GameRoom, profileId: string): number {
  return getComputedScoresByProfile(room).get(profileId) ?? 0;
}

/** Возвращает суммарное время ответов игрока по завершённым вопросам. */
export function getPlayerTotalResponseTimeMs(
  room: GameRoom,
  profileId: string,
  options: PlayerRankOptions = {},
): number {
  const timeoutPenaltyMs = Math.max(0, room.answerTimeoutSec) * 1000;
  return getCompletedQuestions(room).reduce((total, question) => {
    if (options.excludeQuestionId && question.id === options.excludeQuestionId) return total;

    const answer = getQuestionAnswer(question, profileId);
    if (
      !isMissingRoundAnswer(answer) &&
      typeof answer?.responseTimeMs === "number" &&
      Number.isFinite(answer.responseTimeMs)
    ) {
      return total + Math.max(0, answer.responseTimeMs);
    }

    return total + timeoutPenaltyMs;
  }, 0);
}

/** Возвращает profileId победителя, если в финале нет ничьей. */
export function getComputedWinnerProfileId(room: GameRoom): string {
  if (room.status !== "finished" || room.players.length === 0) return "";
  const rankedPlayers = getRankedPlayers(room);
  const firstPlayer = rankedPlayers[0];
  const secondPlayer = rankedPlayers[1];
  if (!firstPlayer) return "";
  if (!secondPlayer) return firstPlayer.profileId;

  const firstScore = getComputedPlayerScore(room, firstPlayer.profileId);
  const secondScore = getComputedPlayerScore(room, secondPlayer.profileId);
  const firstTime = getPlayerTotalResponseTimeMs(room, firstPlayer.profileId);
  const secondTime = getPlayerTotalResponseTimeMs(room, secondPlayer.profileId);
  return firstScore === secondScore && firstTime === secondTime ? "" : firstPlayer.profileId;
}

/** Возвращает игроков, отсортированных по вычисленному счёту. */
export function getRankedPlayers(room: GameRoom): GameRoom["players"] {
  const scores = getComputedScoresByProfile(room);
  return getRankedPlayersByScores(room, scores);
}

/** Возвращает игроков, отсортированных по переданной карте очков. */
export function getRankedPlayersByScores(
  room: GameRoom,
  scores: Map<string, number>,
  options: PlayerRankOptions = {},
): GameRoom["players"] {
  return [...room.players].sort((left, right) => {
    const scoreDiff = (scores.get(right.profileId) ?? 0) - (scores.get(left.profileId) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;

    const timeDiff =
      getPlayerTotalResponseTimeMs(room, left.profileId, options) -
      getPlayerTotalResponseTimeMs(room, right.profileId, options);
    if (timeDiff !== 0) return timeDiff;

    const nameCompare = getRoundPlayerLabel(left).localeCompare(getRoundPlayerLabel(right), "ru");
    if (nameCompare !== 0) return nameCompare;

    return left.profileId.localeCompare(right.profileId, "ru");
  });
}

/** Возвращает место игрока по вычисленному счёту комнаты. */
export function getPlayerPlace(room: GameRoom, player: GamePlayer): number {
  const scoreMap = getComputedScoresByProfile(room);
  return getPlayerPlaceByScores(room, player, scoreMap);
}

/** Возвращает место игрока по переданной карте очков. */
export function getPlayerPlaceByScores(
  room: GameRoom,
  player: GamePlayer,
  scoreMap: Map<string, number>,
  options: PlayerRankOptions = {},
): number {
  const rankedPlayers = getRankedPlayersByScores(room, scoreMap, options);
  const playerIndex = rankedPlayers.findIndex((item) => item.profileId === player.profileId);
  if (playerIndex < 0) return 1;

  const playerScore = scoreMap.get(player.profileId) ?? 0;
  const playerTime = getPlayerTotalResponseTimeMs(room, player.profileId, options);
  let place = playerIndex + 1;

  for (let index = playerIndex - 1; index >= 0; index--) {
    const previous = rankedPlayers[index];
    if (!previous) break;
    const previousScore = scoreMap.get(previous.profileId) ?? 0;
    const previousTime = getPlayerTotalResponseTimeMs(room, previous.profileId, options);
    if (previousScore !== playerScore || previousTime !== playerTime) break;
    place = index + 1;
  }

  return place;
}
