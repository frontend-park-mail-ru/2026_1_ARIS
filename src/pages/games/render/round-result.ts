import { escapeHtml } from "../../../utils/avatar";
import { getFinalRoundResultsUntil } from "../round/reveal";
import { getRoundResultTimerStartMs, getRoundResultTransitionEndMs } from "../round/timeline";
import { roundResultCountdownMs } from "../shared/constants";
import { renderRoundResultCountdown } from "./round-result/countdown";
import { renderRoundAnswerShowcase } from "./round-result/showcase";
import type { RenderRoundResultStageOptions } from "./round-result/types";

export type { RenderRoundResultStageOptions } from "./round-result/types";

/**
 * Рендерит экран результата завершенного раунда.
 */
export function renderRoundResultStage(options: RenderRoundResultStageOptions): string {
  const { room, question } = options;
  const finalResultsUntil = getFinalRoundResultsUntil(room, question);
  const timerStartAtMs = getRoundResultTimerStartMs(room, question);
  const timerDeadlineAt = new Date(getRoundResultTransitionEndMs(room, question)).toISOString();
  const resultTimer = room.nextQuestionAt
    ? renderRoundResultCountdown(room, question, {
        deadlineAt: timerDeadlineAt,
        label: "Следующий вопрос",
        startAtMs: timerStartAtMs,
        durationMs: roundResultCountdownMs,
      })
    : finalResultsUntil
      ? renderRoundResultCountdown(room, question, {
          deadlineAt: finalResultsUntil.toISOString(),
          label: "Итоги игры",
          startAtMs: timerStartAtMs,
          durationMs: roundResultCountdownMs,
        })
      : "";

  return `
    <section class="games-game-stage games-game-stage--result" aria-label="Итоги раунда">
      <div class="games-stage-card games-stage-card--result">
        ${finalResultsUntil ? `<span hidden data-games-final-results-until="${escapeHtml(finalResultsUntil.toISOString())}"></span>` : ""}
        ${resultTimer}
        ${renderRoundAnswerShowcase(options)}
      </div>
    </section>
  `;
}
