import { escapeHtml } from "../../../utils/avatar";
import { getFinalRoundResultsUntil } from "../round/reveal";
import {
  getRoundResultTimelineStartMs,
  getRoundResultTransitionDurationMs,
  getRoundResultTransitionEndMs,
} from "../round/timeline";
import { renderRoundAnswerShowcase } from "./round-result/showcase";
import { renderRoundResultCountdown } from "./round-result/countdown";
import type { RenderRoundResultStageOptions } from "./round-result/types";
import { gameT } from "../shared/i18n";

export type { RenderRoundResultStageOptions } from "./round-result/types";

/**
 * Рендерит экран результата завершенного раунда.
 */
export function renderRoundResultStage(options: RenderRoundResultStageOptions): string {
  const { room, question } = options;
  const finalResultsUntil = getFinalRoundResultsUntil(room, question);
  const shouldShowNextQuestionTimer = room.status === "active";
  const transitionEndAt = new Date(getRoundResultTransitionEndMs(room, question)).toISOString();
  const shouldRefreshAtTransitionEnd = shouldShowNextQuestionTimer && Boolean(room.currentQuestion);
  const resultTimer =
    shouldShowNextQuestionTimer || finalResultsUntil
      ? renderRoundResultCountdown(room, question, {
          deadlineAt: shouldShowNextQuestionTimer
            ? transitionEndAt
            : finalResultsUntil!.toISOString(),
          label: shouldShowNextQuestionTimer
            ? gameT("results.nextQuestionIn")
            : gameT("results.gameResultsIn"),
          startAtMs: getRoundResultTimelineStartMs(question),
          durationMs: getRoundResultTransitionDurationMs(room, question),
        })
      : "";

  return `
    <section class="games-game-stage games-game-stage--result" data-key="stage-result-${escapeHtml(question.id)}" aria-label="${escapeHtml(gameT("results.roundResultsAria"))}">
      <div class="games-stage-card games-stage-card--result">
        ${finalResultsUntil ? `<span hidden data-games-final-results-until="${escapeHtml(finalResultsUntil.toISOString())}"></span>` : ""}
        ${shouldRefreshAtTransitionEnd ? `<span hidden data-games-round-result-until="${escapeHtml(transitionEndAt)}"></span>` : ""}
        ${resultTimer}
        ${renderRoundAnswerShowcase(options)}
      </div>
    </section>
  `;
}
