/**
 * UI-feedback actions комнаты игры.
 *
 * Слой собирает короткие пользовательские сообщения и локальные флаги комнаты,
 * чтобы page bootstrap не держал доменные тексты и pending-состояния.
 */
import type { GameRoom } from "../../../api/games";
import type { GamesPageState } from "../state/store";
import { getRoomFullMessagePatch } from "../state/action-patches";
import type { PendingVoluntaryLeave } from "../room/lifecycle";
import { formatRoomModeLabel } from "../room/profile/system-messages";

export type RoomFeedbackActionsOptions = {
  getPasswordVisible: () => boolean;
  getRoomPasswordDisplayValue: (room: GameRoom, passwordVisible: boolean) => string;
  getPendingVoluntaryLeave: () => PendingVoluntaryLeave | null;
  setPendingVoluntaryLeave: (pending: PendingVoluntaryLeave | null) => void;
  setGamesState: (patch: Partial<GamesPageState>) => void;
};

/**
 * Создаёт UI-feedback actions комнаты игры.
 */
export function createRoomFeedbackActions(options: RoomFeedbackActionsOptions) {
  /**
   * Возвращает отображаемое значение пароля с учётом текущего режима показа.
   */
  function getRoomPasswordDisplayValue(room: GameRoom): string {
    return options.getRoomPasswordDisplayValue(room, options.getPasswordVisible());
  }

  /**
   * Возвращает текст toast при смене ranked-режима комнаты.
   */
  function getRankedTypeToastMessage(isRanked: boolean): string {
    return `Администратор поставил тип игры "${formatRoomModeLabel(isRanked)}"`;
  }

  /**
   * Очищает pending-состояние добровольного выхода из комнаты.
   */
  function clearPendingVoluntaryLeave(roomId?: string): void {
    const pendingVoluntaryLeave = options.getPendingVoluntaryLeave();
    if (!pendingVoluntaryLeave) return;
    if (!roomId || pendingVoluntaryLeave.roomId === roomId) {
      options.setPendingVoluntaryLeave(null);
    }
  }

  /**
   * Показывает сообщение о заполненной комнате.
   */
  function showRoomFullMessage(): void {
    options.setGamesState(getRoomFullMessagePatch());
  }

  return {
    getRoomPasswordDisplayValue,
    getRankedTypeToastMessage,
    clearPendingVoluntaryLeave,
    showRoomFullMessage,
  };
}
