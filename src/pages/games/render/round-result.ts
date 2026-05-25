import { escapeHtml } from "../../../utils/avatar";
import { getFinalRoundResultsUntil } from "../round/reveal";
import { getRoundResultTimerStartMs } from "../round/timeline";
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
  const resultTimer = room.nextQuestionAt
    ? renderRoundResultCountdown(room, question, {
        deadlineAt: room.nextQuestionAt,
        label: "Следующий вопрос",
        startAtMs: timerStartAtMs,
      })
    : finalResultsUntil
      ? renderRoundResultCountdown(room, question, {
          deadlineAt: finalResultsUntil.toISOString(),
          label: "Итоги игры",
          startAtMs: timerStartAtMs,
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
