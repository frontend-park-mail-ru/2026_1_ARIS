import { escapeHtml } from "../../../../utils/avatar";
import {
  formatStoredAnswer,
  getRoundAnswerShowcaseItems,
  getRoundResultPresentationRows,
} from "../../round/model";
import { getRoundTimesRevealDelayMs } from "../../round/timeline";
import { gameT } from "../../shared/i18n";
import type { RenderRoundResultStageOptions } from "./types";
import { renderRoundAnswerShowcaseItem } from "./showcase/cards";

/**
 * Рендерит cinematic-шкалу ответов и правильного значения.
 */
export function renderRoundAnswerShowcase(options: RenderRoundResultStageOptions): string {
  const { room, question, renderPlayerCell } = options;
  const entries = getRoundResultPresentationRows(room, question);
  const showcaseItems = getRoundAnswerShowcaseItems(entries);
  const timeRevealDelayMs = getRoundTimesRevealDelayMs(room, question);
  return `
    <div class="games-round-result-cinema" data-games-round-result-cinema>
      <h2 class="games-stage-card__question">${escapeHtml(question.text)}</h2>
      <p class="games-round-result-correct-answer" data-games-correct-answer>${escapeHtml(
        gameT("results.correctAnswerInline", {
          answer: formatStoredAnswer(question.correctAnswer),
        }),
      )}</p>
      <section class="games-answer-axis" aria-label="${escapeHtml(gameT("results.answerAxisAria"))}" data-games-answer-axis>
        <div class="games-answer-axis__list">
          ${showcaseItems
            .map((item, index) =>
              renderRoundAnswerShowcaseItem(item, index, timeRevealDelayMs, renderPlayerCell),
            )
            .join("")}
        </div>
      </section>
    </div>
  `;
}
