import type { GameRoom } from "../../../../api/games";

/** Создаёт стабильную сигнатуру комнаты без флагов отправленных ответов. */
export function getRoomAnswerProgressComparable(room: GameRoom): string {
  const currentQuestion = room.currentQuestion;
  return JSON.stringify({
    id: room.id,
    status: room.status,
    title: room.title,
    createdByProfileId: room.createdByProfileId,
    isRanked: room.isRanked,
    maxPlayers: room.maxPlayers,
    hasPassword: room.hasPassword,
    password: room.password,
    inviteCodeEnabled: room.inviteCodeEnabled,
    questionCount: room.questionCount,
    answerTimeoutSec: room.answerTimeoutSec,
    currentQuestionIndex: room.currentQuestionIndex,
    nextQuestionAt: room.nextQuestionAt,
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
          startedAt: currentQuestion.startedAt,
          deadlineAt: currentQuestion.deadlineAt,
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
    questions: room.questions.map((question) => ({
      id: question.id,
      position: question.position,
      status: question.status,
      completedAt: question.completedAt,
    })),
    ratingChanges: room.ratingChanges.map((change) => ({
      profileId: change.profileId,
      ratingDelta: change.ratingDelta,
    })),
  });
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

/** Проверяет, отличается ли обновление комнаты только прогрессом отправки ответов. */
export function isAnswerProgressOnlyRoomUpdate(
  previousRoom: GameRoom | null,
  nextRoom: GameRoom,
): boolean {
  if (!previousRoom || previousRoom.id !== nextRoom.id) return false;
  if (previousRoom.status !== "active" || nextRoom.status !== "active") return false;
  if ((previousRoom.currentQuestion?.id ?? "") !== (nextRoom.currentQuestion?.id ?? "")) {
    return false;
  }
  if (getRoomAnswerProgressComparable(previousRoom) !== getRoomAnswerProgressComparable(nextRoom)) {
    return false;
  }

  const previousAnsweredByProfile = new Map(
    previousRoom.players.map((player) => [player.profileId, player.hasAnswered]),
  );
  const playersAnswerStateChanged = nextRoom.players.some(
    (player) => previousAnsweredByProfile.get(player.profileId) !== player.hasAnswered,
  );
  return (
    (previousRoom.currentQuestion?.hasAnswered ?? false) !==
      (nextRoom.currentQuestion?.hasAnswered ?? false) || playersAnswerStateChanged
  );
}
