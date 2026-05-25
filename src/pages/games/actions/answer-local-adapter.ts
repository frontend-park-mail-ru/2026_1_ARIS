/**
 * Adapter локального принятия ответа.
 *
 * Связывает чистую optimistic-логику ответа с текущим состоянием страницы и
 * точечной DOM-синхронизацией формы/rail игроков.
 */
import type { GameRoom } from "../../../api/games";
import type { GamesPageState } from "../state/store";
import { acceptCurrentAnswerLocally as acceptCurrentAnswerLocallyBase } from "./answer-local";

export type AnswerLocalAdapterOptions = {
  getCurrentRoom: () => GameRoom | null;
  setGamesState: (patch: Partial<GamesPageState>) => void;
  patchGamesState: (patch: Partial<GamesPageState>) => void;
  syncCurrentAnswerFormDom: () => void;
  syncPlayersRailAnswerDom: (room?: GameRoom | null) => void;
};

/**
 * Создаёт adapter локального принятия ответа.
 */
export function createAnswerLocalAdapter(options: AnswerLocalAdapterOptions) {
  /**
   * Оптимистично принимает текущий ответ и синхронизирует связанные DOM-точки.
   */
  function acceptCurrentAnswerLocally(
    answer: number,
    room: GameRoom | null = options.getCurrentRoom(),
  ): void {
    acceptCurrentAnswerLocallyBase({
      answer,
      incomingRoom: room,
      currentRoom: options.getCurrentRoom(),
      setGamesState: options.setGamesState,
      patchGamesState: options.patchGamesState,
      syncCurrentAnswerFormDom: options.syncCurrentAnswerFormDom,
      syncPlayersRailAnswerDom: options.syncPlayersRailAnswerDom,
    });
  }

  return {
    acceptCurrentAnswerLocally,
  };
}
