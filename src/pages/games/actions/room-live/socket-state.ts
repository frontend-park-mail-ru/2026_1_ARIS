import type { GameRoom } from "../../../../api/games";
import { getRoomSocketStateUpdate } from "../../room/state/socket-state";
import { getRoomUpdatePatch } from "../../state/room-update-patches";
import type { ApplyRoomSocketStateDeps } from "./types";

/**
 * Применяет socket-обновление комнаты к state страницы.
 */
export async function applyRoomSocketState(
  incomingRoom: GameRoom,
  deps: ApplyRoomSocketStateDeps,
): Promise<void> {
  const previousRoom = deps.getCurrentRoom();
  const hydratedIncomingRoom = await deps.hydrateRoom(incomingRoom);

  if (deps.getCurrentRoom()?.id && deps.getCurrentRoom()?.id !== hydratedIncomingRoom.id) return;

  const update = getRoomSocketStateUpdate({
    previousRoom,
    incomingRoom: hydratedIncomingRoom,
    currentProfileId: deps.getCurrentProfileId(),
    submittedQuestionId: deps.getSubmittedQuestionId(),
    submittedAnswerValue: deps.getSubmittedAnswerValue(),
    getSystemMessages: deps.getSystemMessages,
  });

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
  deps.rememberRoomAccess(update.normalizedRoom);
  deps.clearPendingVoluntaryLeave(update.normalizedRoom.id);
  deps.refreshGamesDom();

  if (update.becameAdmin) {
    deps.showToast("Вы назначены администратором комнаты");
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
