import type { GameRoom } from "../../../../api/games";

/** Создаёт компактную сигнатуру live-состояния комнаты для silent refresh. */
export function getRoomLiveSignature(room: GameRoom | null): string {
  if (!room) return "";
  return JSON.stringify({
    id: room.id,
    status: room.status,
    title: room.title,
    createdByProfileId: room.createdByProfileId,
    isRanked: room.isRanked,
    maxPlayers: room.maxPlayers,
    hasPassword: room.hasPassword,
    password: room.password,
    players: room.players.map((player) => ({
      profileId: player.profileId,
      isReady: player.isReady,
      score: player.score,
    })),
    currentQuestionId: room.currentQuestion?.id ?? "",
    questionsCount: room.questions.length,
  });
}
