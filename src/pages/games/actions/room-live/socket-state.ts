import type { GameRoom } from "../../../../api/games";
import { getRoomSocketStateUpdate } from "../../room/state/socket-state";
import { getAnswerProgressOnlyBlockReason } from "../../room/state/answer-progress";
import { getRoomUpdatePatch } from "../../state/room-update-patches";
import type { ApplyRoomSocketStateDeps } from "./types";
import { gameT } from "../../shared/i18n";
import { debugGamesEvent, debugGamesVerboseEvent } from "../../runtime/debug";
import { playPublicLobbyStartSound } from "../../room/public-lobby-sound";

function getRoomDebugSummary(room: GameRoom | null): Record<string, unknown> | null {
  if (!room) return null;
  return {
    id: room.id,
    status: room.status,
    currentQuestionId: room.currentQuestion?.id ?? "",
    currentQuestionHasAnswered: room.currentQuestion?.hasAnswered ?? null,
    currentQuestionIndex: room.currentQuestionIndex,
    nextQuestionAt: room.nextQuestionAt,
    players: room.players.length,
    answeredPlayers: room.players.filter((player) => player.hasAnswered).length,
    me: room.players.find((player) => player.isMe)?.profileId ?? "",
    completedQuestions: room.questions.filter((question) => question.status === "completed").length,
    activeQuestions: room.questions.filter((question) => question.status === "active").length,
  };
}

/**
 * Применяет socket-обновление комнаты к state страницы.
 */
export async function applyRoomSocketState(
  incomingRoom: GameRoom,
  deps: ApplyRoomSocketStateDeps,
): Promise<void> {
  const initialRoomId = deps.getCurrentRoom()?.id ?? "";
  const hydratedIncomingRoom = await deps.hydrateRoom(incomingRoom);
  const previousRoom = deps.getCurrentRoom();

  if (previousRoom?.id && previousRoom.id !== hydratedIncomingRoom.id) return;
  if (initialRoomId && previousRoom?.id && previousRoom.id !== initialRoomId) return;

  const update = getRoomSocketStateUpdate({
    previousRoom,
    incomingRoom: hydratedIncomingRoom,
    currentProfileId: deps.getCurrentProfileId(),
    submittedQuestionId: deps.getSubmittedQuestionId(),
    submittedAnswerValue: deps.getSubmittedAnswerValue(),
    getSystemMessages: deps.getSystemMessages,
  });
  const blockReason = update.isAnswerProgressOnly
    ? ""
    : getAnswerProgressOnlyBlockReason(previousRoom, update.normalizedRoom);

  const debugPayload = {
    previous: getRoomDebugSummary(previousRoom),
    incoming: getRoomDebugSummary(hydratedIncomingRoom),
    normalized: getRoomDebugSummary(update.normalizedRoom),
    isAnswerProgressOnly: update.isAnswerProgressOnly,
    currentQuestionAnswerChanged: update.currentQuestionAnswerChanged,
    fullRenderReason: blockReason || "non answer-progress update",
  };
  if (update.isAnswerProgressOnly && !update.currentQuestionAnswerChanged) {
    debugGamesVerboseEvent("socket room_state", debugPayload);
  } else {
    debugGamesEvent("socket room_state", debugPayload);
  }

  if (update.isAnswerProgressOnly) {
    deps.patchGamesState({
      room: update.stateRoom,
      roomId: update.stateRoom.id,
      socketOpen: deps.getSocketOpen(),
      submittedQuestionId: update.submittedQuestionId,
      submittedAnswerValue: update.submittedAnswerValue,
    });
    deps.rememberRoomAccess(update.stateRoom);
    if (update.currentQuestionAnswerChanged) {
      deps.syncCurrentAnswerFormDom();
    }
    deps.syncPlayersRailAnswerDom(update.stateRoom);
    return;
  }

  deps.patchGamesState({
    room: update.normalizedRoom,
    roomId: update.normalizedRoom.id,
    disbandConfirmOpen: false,
    startConfirmOpen: false,
    leaveConfirmOpen: false,
    kickConfirmProfileId: "",
    adminConfirmProfileId: "",
    playerMenuProfileId: "",
    titleMenuOpen: false,
    renameTitleModalOpen: false,
    participantsStatusHintOpen: false,
    readyStatusHintOpen: false,
    socketOpen: deps.getSocketOpen(),
    messageReturnRoomId: "",
    messageReturnInviteCode: "",
    messageReturnPassword: "",
    messageRefreshRooms: false,
    error: "",
    ...getRoomUpdatePatch({
      room: update.normalizedRoom,
      currentMessages: deps.getCurrentMessages(),
      systemMessages: update.systemMessages,
      mergeMessages: deps.mergeMessages,
      patch: {
        submittedQuestionId: update.submittedQuestionId,
        submittedAnswerValue: update.submittedAnswerValue,
      },
    }),
  });
  playPublicLobbyStartSound(previousRoom, update.normalizedRoom, deps.getCurrentProfileId());
  deps.rememberRoomAccess(update.normalizedRoom);
  deps.clearPendingVoluntaryLeave(update.normalizedRoom.id);
  deps.refreshGamesDom();

  if (update.becameAdmin) {
    deps.showToast(gameT("room.assignedAdminToast"));
  }
  if (update.rankedChanged) {
    showRankedChangeToast(update.normalizedRoom, deps);
  }
}

/**
 * Показывает toast о смене рейтингового режима с учётом локально ожидаемого действия.
 */
function showRankedChangeToast(room: GameRoom, deps: ApplyRoomSocketStateDeps): void {
  const pendingRankedToast = deps.getPendingRankedToast();
  const pendingMatches =
    pendingRankedToast?.roomId === room.id && pendingRankedToast.isRanked === room.isRanked;
  if (pendingMatches) {
    deps.setPendingRankedToast(null);
    return;
  }
  deps.showToast(deps.getRankedToastMessage(room.isRanked));
}
