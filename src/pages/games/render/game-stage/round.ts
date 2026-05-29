import type { GameRoom } from "../../../../api/games";
import { getLatestCompletedQuestion } from "../../round/model";
import { isRoundResultRevealVisible } from "../../round/reveal";
import { renderRoundResultStage } from "../round-result";
import { renderResultsPlayerCell } from "../room/players";
import type { RenderGamePlayPresenterOptions } from "./types";

/**
 * Рендерит раскрытие последнего завершённого раунда, если оно доступно.
 */
export function renderLatestRoundResultStage(
  room: GameRoom,
  options: RenderGamePlayPresenterOptions,
): string {
  if (!isRoundResultRevealVisible(room)) return "";

  const latestCompleted = getLatestCompletedQuestion(room);
  if (!latestCompleted) return "";

  return renderRoundResultStage({
    room,
    question: latestCompleted,
    renderPlayerCell: (player, playerLabel) =>
      renderResultsPlayerCell({
        player,
        playerLabel,
        getPlayerAvatarUrl: options.getPlayerAvatarUrl,
      }),
  });
}
