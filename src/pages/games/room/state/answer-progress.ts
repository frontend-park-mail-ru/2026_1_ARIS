import type { GameRoom } from "../../../../api/games";

function isCurrentActiveQuestion(room: GameRoom, question: GameRoom["questions"][number]): boolean {
  return room.status === "active" && Boolean(room.currentQuestion?.id === question.id);
}

function hasActiveCurrentQuestion(room: GameRoom): boolean {
  return room.status === "active" && Boolean(room.currentQuestion?.id);
}

type ComparableObject = { [key: string]: ComparableValue };
type ComparableValue = null | string | number | boolean | ComparableValue[] | ComparableObject;

function getRoomAnswerProgressSnapshot(room: GameRoom): ComparableValue {
  const currentQuestion = room.currentQuestion;
  const isActiveQuestion = hasActiveCurrentQuestion(room);
  return {
    id: room.id,
    status: room.status,
    title: room.title,
    inviteCode: room.inviteCode,
    createdByProfileId: room.createdByProfileId,
    isRanked: room.isRanked,
    isPublicLobby: Boolean(room.isPublicLobby),
    maxPlayers: room.maxPlayers,
    hasPassword: room.hasPassword,
    password: room.password,
    inviteCodeEnabled: room.inviteCodeEnabled,
    questionCount: room.questionCount,
    answerTimeoutSec: room.answerTimeoutSec,
    roundPauseSec: room.roundPauseSec ?? 0,
    currentQuestionIndex: room.currentQuestionIndex,
    nextQuestionAt: isActiveQuestion ? "" : room.nextQuestionAt,
    pausedByProfileId: room.pausedByProfileId,
    pauseStartedAt: room.pauseStartedAt,
    pauseUntilAt: room.pauseUntilAt,
    pauseForceVotes: room.pauseForceVotes,
    pauseForceVotesRequired: room.pauseForceVotesRequired,
    winnerProfileId: room.winnerProfileId,
    currentQuestion: currentQuestion
      ? {
          id: currentQuestion.id,
          position: currentQuestion.position,
          text: currentQuestion.text,
          startedAt: isActiveQuestion ? "" : currentQuestion.startedAt,
          deadlineAt: isActiveQuestion ? "" : currentQuestion.deadlineAt,
        }
      : null,
    players: [...room.players]
      .sort((left, right) => left.profileId.localeCompare(right.profileId, "ru"))
      .map((player) => ({
        profileId: player.profileId,
        userAccountId: player.userAccountId,
        name: player.name,
        firstName: player.firstName,
        lastName: player.lastName,
        username: player.username,
        avatarId: player.avatarId,
        pauseUsed: player.pauseUsed,
        forceResumeRequested: player.forceResumeRequested,
        isMe: player.isMe,
      })),
    questions: room.questions.map((question) => {
      const isActiveQuestion = isCurrentActiveQuestion(room, question);
      return {
        id: question.id,
        position: question.position,
        status: isActiveQuestion ? "active" : question.status,
        text: question.text,
        correctAnswer: isActiveQuestion ? null : question.correctAnswer,
        winnerProfileId: isActiveQuestion ? "" : question.winnerProfileId,
        completedAt: isActiveQuestion ? "" : question.completedAt,
        answers: isActiveQuestion
          ? []
          : question.answers.map((answer) => ({
              profileId: answer.profileId,
              answer: answer.answer,
              distance: answer.distance,
              responseTimeMs: answer.responseTimeMs,
              isWinner: answer.isWinner,
            })),
      };
    }),
    ratingChanges: room.ratingChanges.map((change) => ({
      profileId: change.profileId,
      ratingDelta: change.ratingDelta,
    })),
  };
}

/** Создаёт стабильную сигнатуру комнаты без флагов отправленных ответов. */
export function getRoomAnswerProgressComparable(room: GameRoom): string {
  return JSON.stringify(getRoomAnswerProgressSnapshot(room));
}

function collectChangedComparablePaths(
  previousValue: ComparableValue,
  nextValue: ComparableValue,
  path: string,
  result: string[],
  maxCount: number,
): void {
  if (result.length >= maxCount) return;
  if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) return;
  if (
    previousValue === null ||
    nextValue === null ||
    typeof previousValue !== "object" ||
    typeof nextValue !== "object"
  ) {
    result.push(path || "root");
    return;
  }

  if (Array.isArray(previousValue) || Array.isArray(nextValue)) {
    if (!Array.isArray(previousValue) || !Array.isArray(nextValue)) {
      result.push(path || "root");
      return;
    }
    const maxLength = Math.max(previousValue.length, nextValue.length);
    for (let index = 0; index < maxLength && result.length < maxCount; index += 1) {
      collectChangedComparablePaths(
        previousValue[index] ?? null,
        nextValue[index] ?? null,
        `${path}[${index}]`,
        result,
        maxCount,
      );
    }
    return;
  }

  const keys = new Set([...Object.keys(previousValue), ...Object.keys(nextValue)]);
  keys.forEach((key) => {
    if (result.length >= maxCount) return;
    collectChangedComparablePaths(
      previousValue[key] ?? null,
      nextValue[key] ?? null,
      path ? `${path}.${key}` : key,
      result,
      maxCount,
    );
  });
}

export function getAnswerProgressOnlyBlockReason(
  previousRoom: GameRoom | null,
  nextRoom: GameRoom,
): string {
  if (!previousRoom) return "no previous room";
  if (previousRoom.id !== nextRoom.id) return "room id changed";
  if (previousRoom.status !== "active" || nextRoom.status !== "active") {
    return `status changed: ${previousRoom.status} -> ${nextRoom.status}`;
  }
  const previousQuestionId = previousRoom.currentQuestion?.id ?? "";
  const nextQuestionId = nextRoom.currentQuestion?.id ?? "";
  if (previousQuestionId !== nextQuestionId) {
    return `current question changed: ${previousQuestionId || "none"} -> ${nextQuestionId || "none"}`;
  }

  const previousSnapshot = getRoomAnswerProgressSnapshot(previousRoom);
  const nextSnapshot = getRoomAnswerProgressSnapshot(nextRoom);
  if (JSON.stringify(previousSnapshot) === JSON.stringify(nextSnapshot)) return "";

  const changedPaths: string[] = [];
  collectChangedComparablePaths(previousSnapshot, nextSnapshot, "", changedPaths, 12);
  return `comparable changed: ${changedPaths.join(", ") || "unknown"}`;
}

/** Объединяет серверный прогресс ответов с текущими очками игроков. */
export function mergeAnswerProgressRoom(previousRoom: GameRoom, nextRoom: GameRoom): GameRoom {
  const nextPlayersByProfile = new Map(
    nextRoom.players.map((player) => [player.profileId, player]),
  );
  const mergedPlayers = previousRoom.players.map((previousPlayer) => {
    const nextPlayer = nextPlayersByProfile.get(previousPlayer.profileId);
    return nextPlayer ? { ...nextPlayer, score: previousPlayer.score } : previousPlayer;
  });
  nextRoom.players.forEach((player) => {
    if (
      !previousRoom.players.some((previousPlayer) => previousPlayer.profileId === player.profileId)
    ) {
      mergedPlayers.push(player);
    }
  });

  return {
    ...nextRoom,
    players: mergedPlayers,
  };
}

/**
 * Проверяет, что socket-обновление не меняет сцену, кроме прогресса ответов.
 *
 * Повторный серверный snapshot после локально принятого ответа тоже считается
 * таким обновлением: DOM уже точечно синхронизирован, полный render вызвал бы
 * заметное мигание вопроса и scoreboard.
 */
export function isAnswerProgressOnlyRoomUpdate(
  previousRoom: GameRoom | null,
  nextRoom: GameRoom,
): boolean {
  if (!previousRoom || previousRoom.id !== nextRoom.id) return false;
  if (previousRoom.status !== "active" || nextRoom.status !== "active") return false;
  if ((previousRoom.currentQuestion?.id ?? "") !== (nextRoom.currentQuestion?.id ?? "")) {
    return false;
  }
  if (getAnswerProgressOnlyBlockReason(previousRoom, nextRoom)) {
    return false;
  }

  return true;
}
