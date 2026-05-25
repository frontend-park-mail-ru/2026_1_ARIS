import { shouldShowFinalRoundResultBeforeSummary } from "../../round/reveal";
import { renderFinalGameStage } from "../final-results";
import { renderProtectedGameProfileLink } from "../room/players";
import type { RenderGamePlayPresenterOptions } from "./types";
import { renderLatestRoundResultStage } from "./round";

/**
 * Рендерит финальный экран или последнее раскрытие раунда перед итогами.
 */
export function renderFinishedGameStage(options: RenderGamePlayPresenterOptions): string {
  const { room, state } = options;

  if (shouldShowFinalRoundResultBeforeSummary(room)) {
    const roundResult = renderLatestRoundResultStage(room, options);
    if (roundResult) return roundResult;
  }

  return renderFinalGameStage({
    room,
    currentPlayer: options.getCurrentPlayer(room) ?? null,
    loading: state.loading,
    getPlayerAvatarUrl: options.getPlayerAvatarUrl,
    renderProfileLink: renderProtectedGameProfileLink,
    renderQuestionActionsMenuButton: options.renderQuestionActionsMenuButton,
  });
}
