import type { GameRoom } from "../../../../api/games";
import { areRoundAnswersTied, isMissingRoundAnswer } from "./answers";
import { getRoundPlayerLabel } from "./players";
import { getRoundResultEntries } from "./results";
import { getCompletedQuestions } from "./questions";
import type { GamePlayer, GameQuestion } from "./types";

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

/** Возвращает таймаут вопроса в миллисекундах для штрафа за пропуск ответа. */
function getQuestionTimeoutMs(room: GameRoom, question: GameQuestion): number {
  const startedAtMs = new Date(question.startedAt).getTime();
  const deadlineAtMs = new Date(question.deadlineAt).getTime();
  if (Number.isFinite(startedAtMs) && Number.isFinite(deadlineAtMs) && deadlineAtMs > startedAtMs) {
    return deadlineAtMs - startedAtMs;
  }

  const timeoutMs = room.answerTimeoutSec * 1000;
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 0;
}

/** Возвращает вклад вопроса в суммарное время игрока. */
function getQuestionAnswerTimeMs(
  room: GameRoom,
  question: GameQuestion,
  profileId: string,
): number {
  const answer = question.answers.find((item) => item.profileId === profileId) ?? null;
  if (!isMissingRoundAnswer(answer) && Number.isFinite(answer?.responseTimeMs ?? Number.NaN)) {
    return Math.max(0, answer?.responseTimeMs ?? 0);
  }
  return getQuestionTimeoutMs(room, question);
}

/** Считает суммарное время ответов игроков по переданным вопросам. */
function getTotalAnswerTimeByQuestions(
  room: GameRoom,
  questions: GameQuestion[],
): Map<string, number> {
  const times = new Map(room.players.map((player) => [player.profileId, 0]));
  questions.forEach((question) => {
    room.players.forEach((player) => {
      times.set(
        player.profileId,
        (times.get(player.profileId) ?? 0) +
          getQuestionAnswerTimeMs(room, question, player.profileId),
      );
    });
  });
  return times;
}

/** Считает суммарное время ответов игроков по завершённым вопросам. */
export function getTotalAnswerTimeByProfile(room: GameRoom): Map<string, number> {
  return getTotalAnswerTimeByQuestions(room, getCompletedQuestions(room));
}

/** Возвращает суммарное время игроков до выбранного вопроса. */
export function getPreviousRoundAnswerTimeByProfile(
  room: GameRoom,
  question: GameQuestion,
): Map<string, number> {
  return getTotalAnswerTimeByQuestions(
    room,
    getCompletedQuestions(room).filter((item) => item.id !== question.id),
  );
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

/** Возвращает profileId победителя, если в финале нет ничьей. */
export function getComputedWinnerProfileId(room: GameRoom): string {
  if (room.status !== "finished" || room.players.length === 0) return "";
  const scores = getComputedScoresByProfile(room);
  const answerTimes = getTotalAnswerTimeByProfile(room);
  const rankedPlayers = getRankedPlayers(room);
  const firstPlayer = rankedPlayers[0];
  const secondPlayer = rankedPlayers[1];
  if (!firstPlayer) return "";
  if (!secondPlayer) return firstPlayer.profileId;

  const firstScore = scores.get(firstPlayer.profileId) ?? 0;
  const secondScore = scores.get(secondPlayer.profileId) ?? 0;
  const firstTime = answerTimes.get(firstPlayer.profileId) ?? 0;
  const secondTime = answerTimes.get(secondPlayer.profileId) ?? 0;
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
  answerTimes: Map<string, number> = getTotalAnswerTimeByProfile(room),
): GameRoom["players"] {
  return [...room.players].sort((left, right) => {
    const scoreDiff = (scores.get(right.profileId) ?? 0) - (scores.get(left.profileId) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    const timeDiff =
      (answerTimes.get(left.profileId) ?? 0) - (answerTimes.get(right.profileId) ?? 0);
    if (timeDiff !== 0) return timeDiff;
    return getRoundPlayerLabel(left).localeCompare(getRoundPlayerLabel(right), "ru");
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
  answerTimeMap: Map<string, number> = getTotalAnswerTimeByProfile(room),
): number {
  const rankedPlayers = getRankedPlayersByScores(room, scoreMap, answerTimeMap);
  let place = 1;
  for (let index = 0; index < rankedPlayers.length; index++) {
    const current = rankedPlayers[index];
    const previous = rankedPlayers[index - 1];
    if (!current) continue;
    if (
      previous &&
      ((scoreMap.get(previous.profileId) ?? 0) !== (scoreMap.get(current.profileId) ?? 0) ||
        (answerTimeMap.get(previous.profileId) ?? 0) !==
          (answerTimeMap.get(current.profileId) ?? 0))
    ) {
      place = index + 1;
    }
    if (current.profileId === player.profileId) return place;
  }
  return 1;
}
