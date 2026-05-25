import type { GameRoom } from "../../../../api/games";
import { clampNumber } from "../../shared/popovers";

/** Возвращает процент голосов за принудительное продолжение комнаты. */
export function getPauseVotePercent(room: GameRoom): number {
  if (!room.pauseForceVotesRequired) return 0;
  return clampNumber((room.pauseForceVotes / room.pauseForceVotesRequired) * 100, 0, 100);
}
