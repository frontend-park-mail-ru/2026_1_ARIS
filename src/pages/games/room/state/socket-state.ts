import type { GameRoom, GameRoomMessage } from "../../../../api/games";
import { isAnswerProgressOnlyRoomUpdate, mergeAnswerProgressRoom } from "./answer-progress";
import { normalizeLobbyRoomUpdate } from "./lobby-updates";

export type RoomSocketStateUpdateInput = {
  previousRoom: GameRoom | null;
  incomingRoom: GameRoom;
  currentProfileId: string;
  submittedQuestionId: string;
  submittedAnswerValue: string;
  getSystemMessages: (previousRoom: GameRoom | null, nextRoom: GameRoom) => GameRoomMessage[];
};

export type RoomSocketStateUpdate = {
  normalizedRoom: GameRoom;
  stateRoom: GameRoom;
  systemMessages: GameRoomMessage[];
  isAnswerProgressOnly: boolean;
  currentQuestionAnswerChanged: boolean;
  becameAdmin: boolean;
  rankedChanged: boolean;
  submittedQuestionId: string;
  submittedAnswerValue: string;
};

/** Проверяет, можно ли сохранить локальный submitted-answer при socket-обновлении. */
function shouldKeepSubmittedAnswer(
  previousRoom: GameRoom | null,
  nextRoom: GameRoom,
  submittedQuestionId: string,
): boolean {
  const previousQuestionId = previousRoom?.currentQuestion?.id ?? "";
  const nextQuestionId = nextRoom.currentQuestion?.id ?? "";
  return (
    Boolean(nextQuestionId) &&
    previousQuestionId === nextQuestionId &&
    submittedQuestionId === nextQuestionId
  );
}

/** Готовит чистую модель обновления состояния комнаты из socket-события. */
export function getRoomSocketStateUpdate(input: RoomSocketStateUpdateInput): RoomSocketStateUpdate {
  const previousAdminId = input.previousRoom?.createdByProfileId ?? "";
  const normalizedRoom = normalizeLobbyRoomUpdate(input.previousRoom, input.incomingRoom);
  const keepSubmittedAnswer = shouldKeepSubmittedAnswer(
    input.previousRoom,
    normalizedRoom,
    input.submittedQuestionId,
  );
  const isAnswerProgressOnly = isAnswerProgressOnlyRoomUpdate(input.previousRoom, normalizedRoom);
  const stateRoom =
    isAnswerProgressOnly && input.previousRoom
      ? mergeAnswerProgressRoom(input.previousRoom, normalizedRoom)
      : normalizedRoom;

  return {
    normalizedRoom,
    stateRoom,
    systemMessages: input.getSystemMessages(input.previousRoom, normalizedRoom),
    isAnswerProgressOnly,
    currentQuestionAnswerChanged:
      (input.previousRoom?.currentQuestion?.hasAnswered ?? false) !==
      (stateRoom.currentQuestion?.hasAnswered ?? false),
    becameAdmin:
      Boolean(previousAdminId) &&
      previousAdminId !== input.incomingRoom.createdByProfileId &&
      input.incomingRoom.createdByProfileId === input.currentProfileId,
    rankedChanged:
      input.previousRoom?.id === input.incomingRoom.id &&
      input.previousRoom.status === "waiting" &&
      input.incomingRoom.status === "waiting" &&
      input.previousRoom.isRanked !== input.incomingRoom.isRanked,
    submittedQuestionId: keepSubmittedAnswer ? input.submittedQuestionId : "",
    submittedAnswerValue: keepSubmittedAnswer ? input.submittedAnswerValue : "",
  };
}
