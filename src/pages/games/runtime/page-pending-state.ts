/**
 * Pending-состояния страницы игр.
 *
 * Хранит временные runtime-флаги, которые не должны попадать в основной
 * StateManager: toast смены режима, voluntary leave и ключи жалоб.
 */
import type { PendingRankedToast } from "../actions/room-live";
import type { PendingVoluntaryLeave } from "../room/lifecycle";

/**
 * Создаёт контейнер pending-состояний страницы игр.
 */
export function createGamesPagePendingState() {
  let pendingRankedToast: PendingRankedToast | null = null;
  let pendingVoluntaryLeave: PendingVoluntaryLeave | null = null;
  const reportingQuestionKeys = new Set<string>();
  const reportedQuestionKeys = new Set<string>();

  /**
   * Возвращает pending-toast смены ranked-режима.
   */
  function getPendingRankedToast(): PendingRankedToast | null {
    return pendingRankedToast;
  }

  /**
   * Сохраняет pending-toast смены ranked-режима.
   */
  function setPendingRankedToast(toast: PendingRankedToast | null): void {
    pendingRankedToast = toast;
  }

  /**
   * Возвращает pending-состояние добровольного выхода из комнаты.
   */
  function getPendingVoluntaryLeave(): PendingVoluntaryLeave | null {
    return pendingVoluntaryLeave;
  }

  /**
   * Сохраняет pending-состояние добровольного выхода из комнаты.
   */
  function setPendingVoluntaryLeave(pending: PendingVoluntaryLeave | null): void {
    pendingVoluntaryLeave = pending;
  }

  return {
    reportingQuestionKeys,
    reportedQuestionKeys,
    getPendingRankedToast,
    setPendingRankedToast,
    getPendingVoluntaryLeave,
    setPendingVoluntaryLeave,
  };
}

export type GamesPagePendingState = ReturnType<typeof createGamesPagePendingState>;
