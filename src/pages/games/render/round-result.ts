import { escapeHtml } from "../../../utils/avatar";
import { getFinalRoundResultsUntil } from "../round/reveal";
import { getQuestionResultSignature } from "../round/model";
import {
  getRoundResultTimerStartMs,
  getRoundResultTransitionEndDelayMs,
  getRoundResultTransitionEndMs,
} from "../round/timeline";
import { renderRoundResultCountdown } from "./round-result/countdown";
import { renderRoundAnswerShowcase } from "./round-result/showcase";
import type { RenderRoundResultStageOptions } from "./round-result/types";
import { gameT } from "../shared/i18n";

export type { RenderRoundResultStageOptions } from "./round-result/types";

/**
 * Рендерит экран результата завершенного раунда.
 */
export function renderRoundResultStage(options: RenderRoundResultStageOptions): string {
  const { room, question } = options;
  const finalResultsUntil = getFinalRoundResultsUntil(room, question);
  const timerStartAtMs = getRoundResultTimerStartMs(room, question);
  const timerDeadlineAt = new Date(getRoundResultTransitionEndMs(room, question)).toISOString();
  const timerDurationMs = getRoundResultTransitionEndDelayMs(room, question);
  const resultTimer = room.nextQuestionAt
    ? renderRoundResultCountdown(room, question, {
        deadlineAt: timerDeadlineAt,
        label: gameT("results.nextQuestion"),
        startAtMs: timerStartAtMs,
        durationMs: timerDurationMs,
      })
    : finalResultsUntil
      ? renderRoundResultCountdown(room, question, {
          deadlineAt: finalResultsUntil.toISOString(),
          label: gameT("results.gameResults"),
          startAtMs: timerStartAtMs,
          durationMs: timerDurationMs,
        })
      : "";

  return `
    <section class="games-game-stage games-game-stage--result" aria-label="${escapeHtml(gameT("results.roundResultsAria"))}" data-games-round-result-stage data-games-round-result-question-id="${escapeHtml(question.id)}" data-games-round-result-signature="${escapeHtml(getQuestionResultSignature(question))}">
      <div class="games-stage-card games-stage-card--result">
        <div data-games-round-result-dynamic>
          ${finalResultsUntil ? `<span hidden data-games-final-results-until="${escapeHtml(finalResultsUntil.toISOString())}"></span>` : ""}
          ${resultTimer}
        </div>
        ${renderRoundAnswerShowcase(options)}
      </div>
    </section>
  `;
}
