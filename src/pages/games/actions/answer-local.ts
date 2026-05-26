import type { GameRoom } from "../../../api/games";
import { formatStoredAnswer } from "../round/model";
import { mergeAnswerProgressRoom } from "../room/state/answer-progress";
import type { GamesPageState } from "../state/store";

export type AcceptCurrentAnswerLocallyOptions = {
  answer: number;
  incomingRoom: GameRoom | null;
  currentRoom: GameRoom | null;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  syncCurrentAnswerFormDom: () => void;
  syncPlayersRailAnswerDom: (room?: GameRoom | null) => void;
};

/** Возвращает комнату с локально принятым ответом текущего игрока. */
function getLocalAcceptedAnswerRoom(room: GameRoom): GameRoom {
  const question = room.currentQuestion;
  if (!question) return room;

  return {
    ...room,
    currentQuestion: { ...question, hasAnswered: true },
    players: room.players.map((player) =>
      player.isMe ? { ...player, hasAnswered: true } : player,
    ),
  };
}

/**
 * Оптимистично отмечает текущий ответ как принятый без полного rerender комнаты.
 */
export function acceptCurrentAnswerLocally(options: AcceptCurrentAnswerLocallyOptions): void {
  const { answer, incomingRoom, currentRoom } = options;
  const questionId = currentRoom?.currentQuestion?.id ?? "";

  if (!currentRoom || !questionId) {
    if (incomingRoom) {
      options.setGamesState({
        room: incomingRoom,
        error: "",
        errorTarget: "",
        message: "",
        submittedQuestionId: questionId,
        submittedAnswerValue: formatStoredAnswer(answer),
      });
    }
    return;
  }

  const answerProgressRoom =
    incomingRoom?.currentQuestion?.id === questionId
      ? mergeAnswerProgressRoom(currentRoom, incomingRoom)
      : currentRoom;
  const answerProgressQuestion = answerProgressRoom.currentQuestion;
  if (!answerProgressQuestion) return;
  const acceptedAnswerRoom = getLocalAcceptedAnswerRoom(answerProgressRoom);

  options.patchGamesState({
    submittedQuestionId: questionId,
    submittedAnswerValue: formatStoredAnswer(answer),
    room: acceptedAnswerRoom,
    error: "",
    errorTarget: "",
    message: "",
  });
  options.syncCurrentAnswerFormDom();
  options.syncPlayersRailAnswerDom(acceptedAnswerRoom);
}
